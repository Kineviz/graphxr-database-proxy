import React from "react";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  Form,
  FormInstance,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined, ReloadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { projectService } from "../services/projectService";
import {
  DatabaseType,
  EmbeddedInspectResponse,
  EngineStatus,
  ExternalStore,
  StoreEntry,
} from "../types/project";

const { Dragger } = Upload;
const { Option } = Select;
const { Text } = Typography;

interface Props {
  databaseType: DatabaseType;
  form: FormInstance;
  /** Decides the subdirectory an upload lands in. */
  projectName: string;
}

/** How long to wait after the last keystroke before asking the proxy what a path is. */
const INSPECT_DEBOUNCE_MS = 500;

/** How often to re-read the engine's state while a download runs. */
const POLL_INTERVAL_MS = 1500;

/**
 * How many library entries the path field offers.
 *
 * A cap, because the proxy reads a header per row it returns and a dropdown is not
 * worth opening a thousand files for. When there are more than this the list says
 * so rather than quietly ending — a truncated list that looks complete is how a
 * user concludes their store is missing.
 */
const LIBRARY_LIMIT = 100;

const FAMILY_LABEL: Record<string, string> = {
  kuzu: "Kuzu",
  ladybug: "Ladybug",
  latticedb: "LatticeDB",
};

//: The tag colour per engine, so a store reads the same in the form and the library.
const FAMILY_COLOR: Record<string, string> = {
  kuzu: "geekblue",
  ladybug: "magenta",
  latticedb: "purple",
};

interface PathOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface PathOptionGroup {
  label: React.ReactNode;
  options: PathOption[];
}

/**
 * The value of one option, for filtering.
 *
 * rc-select hands `filterOption` each leaf option even when the options are
 * grouped, but types the argument as whatever was passed to `options` — which is
 * the group. Narrowed here rather than cast at the call site.
 */
const optionValue = (option: unknown): string => {
  const value = (option as { value?: unknown } | undefined)?.value;
  return typeof value === "string" ? value : "";
};

const formatSize = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

/**
 * The embedded-store section of the project form.
 *
 * An embedded store has no host and no credentials, so the whole configuration is
 * one path — typed, picked, or dropped. What this adds beyond an input box is the
 * thing the user cannot see for themselves: the file's first bytes say which engine
 * wrote it and in which storage format, and that decides which engine build has to
 * be downloaded before the project will work at all.
 *
 * The download is started here rather than left to the first query. A cold engine
 * takes tens of seconds to fetch, and GraphXR would time out long before it
 * finished — so the form does it while the user is still looking at the form, and
 * shows what it is doing.
 */
const EmbeddedStoreConfig: React.FC<Props> = ({ databaseType, form, projectName }) => {
  const path = Form.useWatch("database_path", form) as string | undefined;
  const pin = Form.useWatch("engine_version", form) as string | undefined;

  const [inspecting, setInspecting] = React.useState(false);
  const [inspection, setInspection] = React.useState<EmbeddedInspectResponse | null>(null);
  const [engine, setEngine] = React.useState<EngineStatus | null>(null);
  const [uploadPercent, setUploadPercent] = React.useState<number | null>(null);

  const [library, setLibrary] = React.useState<StoreEntry[]>([]);
  const [external, setExternal] = React.useState<ExternalStore[]>([]);
  const [libraryTotal, setLibraryTotal] = React.useState(0);
  const [libraryLoading, setLibraryLoading] = React.useState(false);

  const family = FAMILY_LABEL[databaseType] || databaseType;

  // -- what is already on the proxy -----------------------------------------

  const loadLibrary = React.useCallback(async () => {
    setLibraryLoading(true);
    try {
      const listing = await projectService.listStores({
        limit: LIBRARY_LIMIT,
        includeExternal: true,
      });
      setLibrary(listing.items.filter((item) => item.servable));
      setExternal(listing.external.filter((item) => item.database_type in FAMILY_LABEL));
      setLibraryTotal(listing.total);
    } catch {
      // Not being able to list the library is not a reason to block the form: the
      // path can still be typed, and that is the field that matters.
      setLibrary([]);
      setExternal([]);
      setLibraryTotal(0);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const pathOptions = React.useMemo<PathOptionGroup[]>(() => {
    const groups: PathOptionGroup[] = [];

    const describe = (entry: StoreEntry) => (
      <Space size={4} wrap>
        <Text strong>{entry.name}</Text>
        {entry.folder && <Text type="secondary">{entry.folder}</Text>}
        <Tag color={FAMILY_COLOR[entry.engine || ""] || "default"}>
          {FAMILY_LABEL[entry.engine || ""] || entry.engine}
          {entry.resolved_version ? ` ${entry.resolved_version}` : ""}
        </Tag>
        <Text type="secondary">{formatSize(entry.size)}</Text>
        {entry.used_by.length > 0 && (
          <Text type="secondary">· used by {entry.used_by.join(", ")}</Text>
        )}
      </Space>
    );

    if (library.length) {
      const options: PathOption[] = library.map((entry) => ({
        value: entry.path,
        label: describe(entry),
      }));
      if (libraryTotal > library.length) {
        options.push({
          value: `__more__:${libraryTotal}`,
          disabled: true,
          label: (
            <Text type="secondary">
              {libraryTotal - library.length} more in the library — open Files to see them
            </Text>
          ),
        });
      }
      groups.push({ label: "In the store library", options });
    }

    if (external.length) {
      groups.push({
        label: "Used by other projects",
        options: external.map((entry) => ({
          value: entry.path,
          label: (
            <Space size={4} wrap>
              <Text strong>{entry.path}</Text>
              <Tag color={FAMILY_COLOR[entry.database_type || ""] || "default"}>
                {FAMILY_LABEL[entry.database_type] || entry.database_type}
              </Tag>
              <Text type="secondary">· {entry.used_by.join(", ")}</Text>
            </Space>
          ),
        })),
      });
    }

    return groups;
  }, [library, external, libraryTotal]);

  // -- identifying the store ------------------------------------------------

  React.useEffect(() => {
    const target = (path || "").trim();
    if (!target) {
      setInspection(null);
      setEngine(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setInspecting(true);
      try {
        const result = await projectService.inspectEmbeddedPath(target, pin);
        if (!cancelled) {
          setInspection(result);
          setEngine(result.engine_status || null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setInspection({
            success: false,
            candidates: [],
            error: error?.response?.data?.detail || error?.message || String(error),
          });
        }
      } finally {
        if (!cancelled) setInspecting(false);
      }
    }, INSPECT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [path, pin]);

  // -- fetching the engine --------------------------------------------------

  const wanted = inspection?.success ? inspection.resolved_version : null;
  const wantedEngine = inspection?.engine || null;

  React.useEffect(() => {
    if (!wanted || !wantedEngine) return;
    if (engine?.installed && engine.version === wanted) return;

    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      try {
        const all = await projectService.listEngines();
        const found = all.find((one) => one.engine === wantedEngine && one.version === wanted);
        if (cancelled) return;
        if (found) setEngine(found);
        // Keep watching only while there is something to watch.
        if (!found || (found.status !== "ready" && found.status !== "failed")) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        // A transient failure while polling is not worth a message box; the next
        // tick will pick the state back up.
        if (!cancelled) timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    (async () => {
      try {
        const started = await projectService.installEngine(wantedEngine, wanted);
        if (!cancelled) setEngine(started);
        if (!cancelled && started.status !== "ready") poll();
      } catch (error: any) {
        if (!cancelled) {
          message.error(
            `Could not start the ${wantedEngine} ${wanted} download: ` +
              (error?.response?.data?.detail || error?.message || error),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [wanted, wantedEngine]);

  // -- dropping a store -----------------------------------------------------

  const send = async (file: File, overwrite: boolean): Promise<EmbeddedInspectResponse> =>
    projectService.uploadEmbeddedStore(file, projectName, overwrite);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const file = options.file as File;
    setUploadPercent(0);
    try {
      let result: EmbeddedInspectResponse;
      try {
        result = await send(file, false);
      } catch (error: any) {
        if (error?.response?.status !== 409) throw error;
        // Replacing a database is always a deliberate second call.
        const replace = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: "A store with that name is already there",
            content: error?.response?.data?.detail,
            okText: "Replace it",
            okButtonProps: { danger: true },
            cancelText: "Keep the existing one",
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!replace) {
          options.onError?.(new Error("cancelled"));
          return;
        }
        result = await send(file, true);
      }

      if (!result.success) {
        message.error(result.error || "That file is not an embedded store");
        options.onError?.(new Error(result.error || "not a store"));
        return;
      }

      if (result.engine && result.engine !== databaseType) {
        message.info(
          `That is a ${FAMILY_LABEL[result.engine] || result.engine} store; ` +
            `it will be served with the ${FAMILY_LABEL[result.engine] || result.engine} engine.`,
        );
      }

      form.setFieldsValue({ database_path: result.path });
      setInspection(result);
      setEngine(result.engine_status || null);
      message.success(`${file.name} uploaded`);
      options.onSuccess?.(result);
      loadLibrary();
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || String(error);
      message.error(`Upload failed: ${detail}`);
      options.onError?.(error as Error);
    } finally {
      setUploadPercent(null);
    }
  };

  // -- what the user is told ------------------------------------------------

  const detection = () => {
    if (inspecting) return <Alert type="info" showIcon message="Reading the store…" />;
    if (!inspection) return null;

    if (!inspection.success) {
      return <Alert type="error" showIcon message="Not a store" description={inspection.error} />;
    }

    const mismatch = inspection.engine && inspection.engine !== databaseType;
    const detail = [
      inspection.description,
      inspection.layout === "directory"
        ? "directory layout, written by Kuzu 0.10 or older"
        : null,
      inspection.resolved_version
        ? `engine ${inspection.engine} ${inspection.resolved_version}`
        : inspection.error,
    ]
      .filter(Boolean)
      .join(" · ");

    if (mismatch) {
      // Not a problem to fix: the two families are one codebase with two names, so
      // the file picks the engine and the project type only picks the URL. Said out
      // loud all the same, because a substitution nobody is told about is a trap.
      const other = FAMILY_LABEL[inspection.engine!] || inspection.engine;
      return (
        <Alert
          type="info"
          showIcon
          message={`This is a ${other} store, and will be served with the ${other} engine`}
          description={`${detail}. The project stays a ${family} project — only the engine follows the file.`}
        />
      );
    }
    if (!inspection.resolved_version) {
      return <Alert type="warning" showIcon message="Unrecognised storage format" description={detail} />;
    }
    return <Alert type="success" showIcon message="Store recognised" description={detail} />;
  };

  const engineState = () => {
    if (!engine) return null;
    if (engine.status === "ready" || engine.installed) {
      return (
        <Alert
          type="success"
          showIcon
          message={`Engine ${engine.engine} ${engine.version} is ready`}
        />
      );
    }
    if (engine.status === "failed") {
      return (
        <Alert
          type="error"
          showIcon
          message={`Could not install ${engine.engine} ${engine.version}`}
          description={engine.error}
        />
      );
    }
    return (
      <Alert
        type="info"
        showIcon
        message={`Downloading ${engine.engine} ${engine.version}…`}
        description={
          <>
            <div style={{ marginBottom: 8, wordBreak: "break-all" }}>{engine.detail}</div>
            <Progress percent={100} status="active" showInfo={false} />
          </>
        }
      />
    );
  };

  return (
    <Card title={`${family} Configuration`} size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label={
              <Space size={4}>
                <span>Database path</span>
                <Tooltip title="Re-read the store library">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    loading={libraryLoading}
                    onClick={loadLibrary}
                  />
                </Tooltip>
              </Space>
            }
            name="database_path"
            tooltip="Pick a store the proxy already has, or type the path to one — the directory itself for a store written by Kuzu 0.10 or older"
            rules={[{ required: true, message: "Please enter the path to the store" }]}
          >
            <AutoComplete
              options={pathOptions}
              // The dropdown is a shortcut, not the only way in: a store anywhere on
              // the proxy's disk is a valid answer and has to stay typeable.
              filterOption={(input, option) =>
                optionValue(option).toLowerCase().includes(input.toLowerCase())
              }
              popupMatchSelectWidth={false}
              notFoundContent={
                libraryLoading ? "Reading the store library…" : "Nothing in the store library yet"
              }
            >
              <Input placeholder="e.g. C:\\data\\graph.kz or /srv/data/graph.kz" allowClear />
            </AutoComplete>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Or drop the store here">
        <Dragger
          name="file"
          multiple={false}
          maxCount={1}
          customRequest={handleUpload}
          showUploadList={false}
          disabled={uploadPercent !== null}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Drag a {family} store here, or click to choose one</p>
          <p className="ant-upload-hint" style={{ padding: "0 24px" }}>
            It is copied onto the proxy and the path is filled in for you. A store
            written by Kuzu 0.10 or older is a directory rather than a file — give
            its path above instead.
          </p>
        </Dragger>
        {uploadPercent !== null && (
          <Progress percent={100} status="active" showInfo={false} style={{ marginTop: 8 }} />
        )}
      </Form.Item>

      <Space direction="vertical" size="small" style={{ width: "100%", marginBottom: 16 }}>
        {detection()}
        {engineState()}
      </Space>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Engine version"
            name="engine_version"
            tooltip='Leave empty to let the file decide. "0.19" means the newest 0.19.x.'
          >
            <Input placeholder="Automatic" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Access"
            name="read_only"
            tooltip="A read-only store can be opened by several processes at once; a writable one is held exclusively by this proxy."
          >
            <Select>
              <Option value={true}>Read-only (recommended)</Option>
              <Option value={false}>Writable — this proxy holds the store exclusively</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
};

export default EmbeddedStoreConfig;
