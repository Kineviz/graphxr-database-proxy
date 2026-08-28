import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { projectService } from '../services/projectService';
import { EmbeddedInspectResponse, StoreEntry } from '../types/project';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

/** How long to wait after the last keystroke before re-running the search. */
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_PAGE_SIZE = 10;

/**
 * What each recognised file is, in the words the page uses.
 *
 * The two engines are servable today; the rest are here so a file that really is
 * sitting in the library is named rather than dismissed as "unrecognised". Adding
 * a driver later means the row stops saying "no driver yet" — the row itself was
 * always correct.
 */
const KIND_LABEL: Record<string, { label: string; color: string; note?: string }> = {
  kuzu: { label: 'Kuzu', color: 'geekblue' },
  ladybug: { label: 'Ladybug', color: 'magenta' },
  latticedb: { label: 'LatticeDB', color: 'purple' },
  sqlite: { label: 'SQLite', color: 'default', note: 'no driver yet' },
  duckdb: { label: 'DuckDB', color: 'default', note: 'no driver yet' },
  unknown: { label: 'Unrecognised', color: 'default' },
};

const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

/**
 * The store library: the embedded databases the proxy holds on its own disk.
 *
 * A project points at a path, and a dropped file lands under `config/databases`.
 * Until this page there was no way to see those again — which file a project was
 * using, what was taking up the disk, or whether the one you uploaded last week is
 * still there. Everything here is about answering that before something is deleted
 * rather than after.
 *
 * The listing is paged at the proxy rather than fetched whole. Each row costs a
 * header read, so "show me everything" is a request to open every file in the
 * directory, and a library of any size is exactly where that stops being free.
 */
const StoreLibrary: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = React.useState<StoreEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [root, setRoot] = React.useState('');
  const [folders, setFolders] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');

  const [folder, setFolder] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  // -- loading --------------------------------------------------------------

  const load = React.useCallback(
    async (targetPage: number, targetSize: number, targetSearch: string) => {
      setLoading(true);
      try {
        const listing = await projectService.listStores({
          offset: (targetPage - 1) * targetSize,
          limit: targetSize,
          search: targetSearch,
        });
        setItems(listing.items);
        setTotal(listing.total);
        setRoot(listing.root);
        setFolders(listing.folders);
        setError(null);
      } catch (caught: any) {
        setError(caught?.response?.data?.detail || caught?.message || String(caught));
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    load(page, pageSize, search);
  }, [load, page, pageSize, search]);

  // Debounced so typing a name is one request rather than one per keystroke.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const refresh = () => load(page, pageSize, search);

  // -- uploading ------------------------------------------------------------

  const send = (file: File, overwrite: boolean): Promise<EmbeddedInspectResponse> =>
    projectService.uploadEmbeddedStore(file, '', overwrite, folder.trim());

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const file = options.file as File;
    setUploading(true);
    try {
      let result: EmbeddedInspectResponse;
      try {
        result = await send(file, false);
      } catch (caught: any) {
        if (caught?.response?.status !== 409) throw caught;
        // Replacing a database is always a deliberate second call.
        const replace = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: 'A store with that name is already there',
            content: caught?.response?.data?.detail,
            okText: 'Replace it',
            okButtonProps: { danger: true },
            cancelText: 'Keep the existing one',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!replace) {
          options.onError?.(new Error('cancelled'));
          return;
        }
        result = await send(file, true);
      }

      if (!result.success) {
        message.error(result.error || 'That file is not an embedded store');
        options.onError?.(new Error(result.error || 'not a store'));
        return;
      }

      message.success(`${file.name} added to the library`);
      options.onSuccess?.(result);
      setPage(1);
      load(1, pageSize, search);
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail || caught?.message || String(caught);
      message.error(`Upload failed: ${detail}`);
      options.onError?.(caught as Error);
    } finally {
      setUploading(false);
    }
  };

  // -- acting on a row ------------------------------------------------------

  const copyPath = async (entry: StoreEntry) => {
    try {
      await navigator.clipboard.writeText(entry.path);
      message.success('Path copied to clipboard');
    } catch {
      message.error('Could not copy the path');
    }
  };

  const createProject = (entry: StoreEntry) => {
    // The engine read out of the file picks the project type, so the form opens on
    // the one that matches. Either type would work — the file decides the engine
    // regardless — but opening on the wrong one only invites a correction.
    navigate('/addProject', {
      state: { store: { path: entry.path, database_type: entry.engine } },
    });
  };

  const remove = async (entry: StoreEntry, force = false) => {
    try {
      await projectService.deleteStore(entry.relative_path, force);
      message.success(`${entry.name} deleted`);
      // The last row of the last page leaves the page empty otherwise.
      const remaining = total - 1;
      const lastPage = Math.max(1, Math.ceil(remaining / pageSize));
      const next = Math.min(page, lastPage);
      setPage(next);
      load(next, pageSize, search);
    } catch (caught: any) {
      if (caught?.response?.status === 409) {
        Modal.confirm({
          title: 'A project is still pointing at this store',
          icon: <ExclamationCircleOutlined />,
          content: caught?.response?.data?.detail,
          okText: 'Delete it anyway',
          okButtonProps: { danger: true },
          cancelText: 'Keep it',
          onOk: () => remove(entry, true),
        });
        return;
      }
      message.error(caught?.response?.data?.detail || caught?.message || String(caught));
    }
  };

  // -- the table ------------------------------------------------------------

  const columns: ColumnsType<StoreEntry> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, entry) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {entry.folder ? `${entry.folder}/` : ''}
            {entry.layout === 'directory' ? ' · directory layout' : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Kind',
      dataIndex: 'kind',
      key: 'kind',
      render: (kind: string, entry) => {
        const known = KIND_LABEL[kind] || KIND_LABEL.unknown;
        return (
          <Space direction="vertical" size={0}>
            <Tag color={known.color}>{known.label}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {entry.storage_version !== null && entry.storage_version !== undefined
                ? `format ${entry.storage_version}`
                : known.note || ''}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Engine',
      key: 'engine',
      render: (_, entry) => {
        if (!entry.servable) {
          return <Text type="secondary">—</Text>;
        }
        if (!entry.resolved_version) {
          return (
            <Tooltip title="No release the proxy knows about writes or reads this storage format.">
              <Text type="warning">unresolved</Text>
            </Tooltip>
          );
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>{entry.resolved_version}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {entry.engine_installed ? 'installed' : 'downloads on first use'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatSize(size),
    },
    {
      title: 'Modified',
      dataIndex: 'modified',
      key: 'modified',
      render: (modified: number) =>
        modified ? new Date(modified * 1000).toLocaleString() : '—',
    },
    {
      title: 'Used by',
      dataIndex: 'used_by',
      key: 'used_by',
      render: (usedBy: string[]) =>
        usedBy.length ? (
          <Space size={4} wrap>
            {usedBy.map((name) => (
              <Tag key={name} color="green">
                {name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, entry) => (
        <Space size="small">
          <Tooltip title="Copy the path">
            <Button type="text" icon={<CopyOutlined />} onClick={() => copyPath(entry)} />
          </Tooltip>
          <Tooltip
            title={
              entry.servable
                ? 'Create a project on this store'
                : 'The proxy has no driver for this format yet'
            }
          >
            <Button
              type="text"
              icon={<PlusOutlined />}
              disabled={!entry.servable}
              onClick={() => createProject(entry)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this store"
            description={
              entry.used_by.length
                ? `${entry.used_by.join(', ')} still point at it.`
                : 'The file is removed from the proxy. This cannot be undone.'
            }
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => remove(entry)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Tooltip title="Delete from the library">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="store-library">
      <Card
        title={
          <Space>
            <FolderOpenOutlined />
            <span>Database Files</span>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            Refresh
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          The embedded databases this proxy holds on its own disk, under{' '}
          <Text code>{root || 'config/databases'}</Text>. Kuzu, Ladybug and LatticeDB stores can be
          served straight from here; other database files are listed so you can see
          them, but the proxy has no driver for them yet.
        </Paragraph>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Could not read the store library"
            description={error}
            style={{ marginBottom: 16 }}
          />
        )}

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <AutoComplete
              value={folder}
              onChange={setFolder}
              options={folders.map((name) => ({ value: name }))}
              style={{ width: 240 }}
              placeholder="Folder (optional)"
              allowClear
            />
            <Input.Search
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by file name"
              allowClear
              style={{ width: 260 }}
            />
          </Space>

          <Dragger
            name="file"
            multiple={false}
            maxCount={1}
            customRequest={handleUpload}
            showUploadList={false}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Drag a store here, or click to choose one</p>
            <p className="ant-upload-hint" style={{ padding: '0 24px' }}>
              Kuzu, Ladybug and LatticeDB stores only — a file is checked by its first
              bytes as it arrives and refused if it is not one. A store written by Kuzu 0.10 or older
              is a directory rather than a file, so it has to be copied onto the proxy by
              hand; it will appear here once it is.
            </p>
          </Dragger>
          {uploading && <Progress percent={100} status="active" showInfo={false} />}

          <Table
            columns={columns}
            dataSource={items}
            rowKey="relative_path"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              },
              showTotal: (count, range) => `${range[0]}-${range[1]} of ${count} files`,
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default StoreLibrary;
