import React, { useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Space,
  InputNumber,
  Upload,
  message,
  Alert,
  Spin
} from "antd";
import { UploadOutlined, ClockCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  DatabaseType,
  AuthType,
  Project,
  ProjectCreate,
} from "../types/project";
import { projectService } from "../services/projectService";

const { Option } = Select;

interface ProjectFormProps {
  initialValues?: Project | null;
  open: boolean;
  onSubmit: (values: ProjectCreate) => void;
  onCancel: () => void;
}


//window is localhost:9080 use the oauth2 auth by default, otherwise use service account by default
//@todo maybe we can support other auth types in the future
const DefaultAuthType = window.location.origin === "http://localhost:9080" ? "oauth2" : "service_account";


const ProjectForm: React.FC<ProjectFormProps> = ({
  initialValues,
  open,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [databaseType, setDatabaseType] =
    React.useState<DatabaseType>("spanner");
  const [authType, setAuthType] = React.useState<AuthType>(DefaultAuthType);
  const [serviceAccountKey, setServiceAccountKey] = React.useState<any>({});
  // const [showOauthAdvanced, setShowOauthAdvanced] = React.useState(false);
  const [loading, setLoading] = React.useState({
    listProjects: false,
    listDatabases: false,
  });
  const [projectsList, setProjectsList] = React.useState<
    Array<{ id: string; name: string; instances: Array<{ id: string; name: string }> }>
  >([]);
  const [databases, setDatabases] = React.useState<
    Array<{ id: string; name: string; graphDBs?: Array<{ id: string; name: string }> }>
  >([]);

  const cleanupForm = () => {
     form && form.resetFields();
       setServiceAccountKey({});
       setDatabaseType("spanner");
       setAuthType(DefaultAuthType);
       setLoading({ listProjects: false, listDatabases: false });
       setProjectsList([]);
       setDatabases([]);
  }
  useEffect(() => {
    if(!open) {
      cleanupForm();
    }
   }, [open]);
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        database_type: initialValues.database_type,
        ...initialValues.database_config,
      });
      setDatabaseType(initialValues.database_type);
      setAuthType(initialValues.database_config.auth_type);
      updateServiceAccountKey({
        ...initialValues.database_config.oauth_config,
      });
    } else {
      cleanupForm();
    }
  }, [initialValues]);

  const handleSubmit = (values: any) => {
    const { name, database_type, ...dbConfigFields } = values;

    let databaseConfig: any = {
      type: database_type,
      auth_type: authType,
      options: {},
    };

    if (database_type === "spanner") {
      databaseConfig = {
        ...databaseConfig,
        project_id: dbConfigFields.project_id,
        instance_id: dbConfigFields.instance_id,
        database_id: dbConfigFields.database_id,
        graph_name: dbConfigFields.graph_name || "",
      };

      if (authType === "oauth2") {
        databaseConfig.oauth_config = {
           ...serviceAccountKey,
        };
      } else if (authType === "service_account") {
        if (!serviceAccountKey) {
          message.error("Please upload a service account key file");
          return;
        }
        databaseConfig.project_id = serviceAccountKey?.project_id;
        databaseConfig.oauth_config = {
          ...serviceAccountKey,
        };
      } else if (authType === "google_ADC") {
        // ADC 模式不需要额外的配置
        databaseConfig.oauth_config = {
          ...serviceAccountKey,
          google_ADC: true,
        };
      }

      // databaseConfig.options = {
      //   max_sessions: dbConfigFields.max_sessions || 100,
      //   timeout: dbConfigFields.timeout || 30,
      //   read_only: dbConfigFields.read_only || false,
      // };
    }

    const projectData: ProjectCreate = {
      name,
      database_type,
      database_config: databaseConfig,
    };

    onSubmit(projectData);
  };

  const handleDatabaseTypeChange = (value: DatabaseType) => {
    setDatabaseType(value);
    form.resetFields([
      "project_id",
      "instance_id",
      "database_id",
      "host",
      "port",
    ]);
  };

  const handleAuthTypeChange = (value: AuthType) => {
    setAuthType(value);
    form.resetFields(["client_id", "client_secret", "username", "password"]);
    updateServiceAccountKey({});
  };

  const handleServiceAccountUpload: UploadProps["customRequest"] = (
    options
  ) => {
    const { file, onSuccess, onError } = options;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonContent = JSON.parse(content);

        // 验证是否为有效的服务账号文件
        if (
          jsonContent.type === "service_account" &&
          jsonContent.private_key &&
          jsonContent.client_email
        ) {
          updateServiceAccountKey(jsonContent);
          message.success(`${(file as File).name} uploaded successfully`);
          onSuccess?.(jsonContent);
        } else {
          message.error("Invalid service account key file format");
          onError?.(new Error("Invalid file format"));
        }
      } catch (error) {
        message.error("Failed to parse JSON file");
        onError?.(error as Error);
      }
    };

    reader.onerror = () => {
      message.error("Failed to read file");
      onError?.(new Error("Failed to read file"));
    };

    reader.readAsText(file as File);
  };

  const handleRemoveServiceAccount = () => {
    updateServiceAccountKey({});
    message.success("Service account key removed");
  };

  const getProjectsList = async () => {
    try {
      setLoading({ listDatabases: false, listProjects: true });
      const projects = await projectService.listGoogleProjects(serviceAccountKey, authType);
      setProjectsList(Array.isArray(projects) ? projects : []);
      updateServiceAccountKey({
        ...serviceAccountKey,
        project_id: projects.length > 0 ? projects[0].id : "",
      });
    } catch (error: any) {
      if (authType === "google_ADC") {
        message.error("Failed to fetch projects. Please ensure that Application Default Credentials are properly configured in your environment.");
      } else if (error.response?.status === 401) {
        message.error("Authentication required. Please login first.");
      } else {
        message.error("Failed to fetch projects");
      }
    } finally {
      setLoading({ listDatabases: false, listProjects: false });
    }
  };

  const getDatabaseList = async () => {
    try {
      setLoading({ listDatabases: true, listProjects: false });
      const databases = await projectService.listGoogleDatabases(serviceAccountKey, authType);
      setDatabases(databases);
    } catch (error: any) {
      if (error.response?.status === 401) {
        message.error("Authentication required. Please login first.");
      } else {
        message.error("Failed to fetch databases");
      }
    } finally {
      setLoading({ listDatabases: false, listProjects: false });
    }
  };



  useEffect(() => {

    const isNewOauth2 = serviceAccountKey && serviceAccountKey?.token && authType == "oauth2";
    const isNewServiceAccount = serviceAccountKey && serviceAccountKey?.type === "service_account"   && serviceAccountKey.private_key_id;
    const isADC = authType === "google_ADC";
    
    if (
      isNewOauth2 ||
      isNewServiceAccount ||
      isADC
    ) {
      getProjectsList();
    }
  }, [serviceAccountKey?.token, authType, serviceAccountKey?.type , serviceAccountKey.private_key_id]);

  useEffect(() => {
    if (serviceAccountKey && serviceAccountKey?.project_id && serviceAccountKey?.instance_id) {
      getDatabaseList();
    }
  }, [serviceAccountKey?.project_id, serviceAccountKey?.instance_id]);


  const handleGoogleLogin = () => {
    if (window.location.hostname !== "localhost") {
      return message.error(
        "Google OAuth2 login is only supported on localhost for development purposes."
      );
    }
    const authUrl = `/google/spanner/login`;

    // Open popup window instead of iframe
    let popup = window.open(
      authUrl,
      "googleAuth",
      "width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,left=" +
        (screen.width / 2 - 300) +
        ",top=" +
        (screen.height / 2 - 350)
    );

    //read the g_auth_token , g_auth_state, g_auth_email from localStorage, then clean up the localStorage

    const handleGoogleLoginData = () => {
      const token = localStorage.getItem("g_auth_token");
      const state = localStorage.getItem("g_auth_state");
      const email = localStorage.getItem("g_auth_email");
      const refresh_token = localStorage.getItem("g_auth_refresh_token"); 
      const expires_in = localStorage.getItem("g_auth_expires_in");

      localStorage.removeItem("g_auth_token");
      localStorage.removeItem("g_auth_state");
      localStorage.removeItem("g_auth_email");
      localStorage.removeItem("g_auth_refresh_token");
      localStorage.removeItem("g_auth_expires_in");

      if (token && email && state) {
        setServiceAccountKey({
          token,
          refresh_token,
          expires_in,
          last_refreshed: Date.now()/1000,
          state,
          email,
        });
        console.log("Google OAuth2 login successful:", email);
      }
    };

    const checkGoogleLoginDataWrite = () => {
      // Check if the data has been written to localStorage
      const token = localStorage.getItem("g_auth_token");
      const state = localStorage.getItem("g_auth_state");
      const email = localStorage.getItem("g_auth_email");

      if (token && email && state) {
        return true;
      }
      return false;
    };

    // Listen for popup to close
    const timer = setInterval(() => {
      if (checkGoogleLoginDataWrite()) {
        try {
          clearInterval(timer);
          popup?.close();
          popup = null;
          handleGoogleLoginData();
        } catch (e) {
          // Ignore if popup is already closed
        }
      }
    }, 500);
  };

 const updateServiceAccountKey = (newData: any) => {
  const newService = {
      ...serviceAccountKey,
      ...newData,
  };
    setServiceAccountKey((prevKey: any) => ({
      ...prevKey,
      ...newData,
    }));
    form.setFieldsValue({
      project_id: newService.project_id,
      instance_id: newService.instance_id,
      database_id: newService.database_id,
      graph_name: newService.graph_name,
    });
  };

  const isServiceAccount = serviceAccountKey && serviceAccountKey?.type === "service_account" && serviceAccountKey.private_key_id;
  const isGoogleOauth2 = serviceAccountKey && serviceAccountKey?.token && authType == "oauth2";
  const isADC = authType === "google_ADC";

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        redirect_uri: "http://localhost:9080/google/spanner/callback",
        max_sessions: 100,
        timeout: 30,
        read_only: true,
        auth_type:  authType,
        database_type: "spanner",
      }}
    >
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Project Name"
            name="name"
            rules={[{ required: true, message: "Please enter project name" }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Database Type"
            name="database_type"
            rules={[{ required: true, message: "Please select database type" }]}
          >
            <Select
              placeholder="Select database type"
              onChange={handleDatabaseTypeChange}
            >
              <Option value="spanner">Google Cloud Spanner</Option>
              {/* <Option value="postgresql">PostgreSQL</Option>
              <Option value="mysql">MySQL</Option>
              <Option value="mongodb">MongoDB</Option> */}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Authentication Type"
            name="auth_type"
            rules={[
              { required: true, message: "Please select authentication type" },
            ]}
          >
            <Select
              placeholder="Select authentication type"
              onChange={handleAuthTypeChange}
          >
              <Option value="service_account">Service Account</Option>
              <Option value="google_ADC">Application Default Credentials (ADC)</Option>
              <Option value="oauth2">OAuth2</Option>
              {/* <Option value="username_password">Username/Password</Option> */}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {databaseType === "spanner" && (
        <Card
          title="Spanner Configuration"
          size="small"
          style={{ marginBottom: 16 }}
        >
          {authType === "oauth2" && (
            <Card title="OAuth2 Configuration" size="small" type="inner">
              <Row gutter={16}>
                {isGoogleOauth2 && (
                  <Col span={12}>
                    <Button type="link">
                      <span>
                        Logged in as:{" "}
                        <strong>{serviceAccountKey?.email}</strong>
                      </span>
                    </Button>
                  </Col>
                )}
                <Col span={serviceAccountKey?.email ? 12 : 24}>
                  <Button
                    type="primary"
                    icon={<span>🔐</span>}
                    size="large"
                    style={{ width: "100%", marginBottom: 16 }}
                    onClick={handleGoogleLogin}
                  >
                    {isGoogleOauth2
                      ? "Re-login with Google"
                      : "Login with Google"}
                  </Button>
                </Col>
              </Row>
              {/* <Row justify="end">
                <Button
                  type="link"
                  onClick={() => setShowOauthAdvanced(!showOauthAdvanced)}
                  style={{ paddingRight: 0 }}
                >
                  {showOauthAdvanced
                    ? "Hide Advanced Settings"
                    : "Advanced Settings"}
                </Button>
              </Row> */}
              {/* {showOauthAdvanced && (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Client ID"
                        name="client_id"
                        rules={[
                          { required: true, message: "Please enter client ID" },
                        ]}
                      >
                        <Input placeholder="your-oauth-client-id" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Client Secret"
                        name="client_secret"
                        rules={[
                          {
                            required: true,
                            message: "Please enter client secret",
                          },
                        ]}
                      >
                        <Input.Password placeholder="your-oauth-client-secret" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label="Redirect URI" name="redirect_uri">
                        <Input placeholder="http://localhost:9080/google/auth/callback" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )} */}
            </Card>
          )}

          {authType === "service_account" && (
            <Card
              title="Service Account Configuration"
              size="small"
              type="inner"
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="Service Account Key File"
                    rules={[
                      {
                        required: true,
                        message: "Please upload service account key file",
                      },
                    ]}
                  >
                    <Upload
                      customRequest={handleServiceAccountUpload}
                      onRemove={handleRemoveServiceAccount}
                      maxCount={1}
                      accept=".json"
                      showUploadList={{
                        showPreviewIcon: false,
                        showDownloadIcon: false,
                      }}
                    >
                    <Button icon={<UploadOutlined />}>
                     {isServiceAccount && "Re-upload Service Account Key (.json)"}
                      {!isServiceAccount && "Upload Service Account Key (.json)"}
                    </Button>
                    </Upload>
                    {isServiceAccount && (
                      <div style={{ marginTop: 8, color: "#52c41a" }}>
                        ✅ Service account key uploaded successfully
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

          {authType === "google_ADC" && (
            <Card
              title="Application Default Credentials (ADC)"
              size="small"
              type="inner"
            >
              {!loading.listProjects && !loading.listDatabases && projectsList.length === 0 ? (
                <Alert
                  message="ADC Mode Not Supported"
                  description={
                    <div>
                      <p>Unable to use Application Default Credentials.</p>
                      <p style={{ marginTop: 8, marginBottom: 8 }}>
                        This could be because:
                      </p>
                      <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                        <li>ADC is not properly configured in your environment</li>
                        <li>The service account lacks necessary permissions</li>
                        <li>The backend server doesn't support ADC mode</li>
                      </ul>
                      <p style={{ marginTop: 8, marginBottom: 0 }}>
                        Please use <strong>Service Account</strong> authentication instead.
                      </p>
                    </div>
                  }
                  type="error"
                  showIcon
                />
              ) : (
                <Alert
                  message="Using Application Default Credentials"
                  icon={ (loading.listProjects || loading.listDatabases) ? <Spin /> : <InfoCircleOutlined /> }
                  description={
                    <div>
                      <p> ADC will automatically use credentials from:</p>
                      <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                        <li>GOOGLE_APPLICATION_CREDENTIALS environment variable</li>
                        <li>gcloud CLI default credentials</li>
                        <li>Compute Engine/GKE service account (if running on GCP)</li>
                      </ul>
                      <p style={{ marginTop: 8, marginBottom: 0 }}>
                        Make sure your environment is properly configured with GCP credentials.
                      </p>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              )}
            </Card>
          )}

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Form.Item
                label={ <> <span>Project ID </span>  {loading.listProjects &&  <Spin style={{marginLeft:5}} size="small" />} </> }
                name="project_id"
                rules={[{ required: true, message: "Please select a project" }]}
              >
                {authType === "service_account" && (
                  <input
                    style={{ width: "100%", height: 32 }}
                    disabled={authType === "service_account"}
                    value={serviceAccountKey?.project_id}
                  />
                )}
                {authType !== "service_account" && (
                    <Select style={{ width: "100%", height: 32 }} showSearch
                    loading={loading.listProjects}
                    placeholder={loading.listProjects ? "Loading projects..." : "Select a project"}
                    notFoundContent={loading.listProjects ? "Loading projects..." : "No projects found"}
                    value={serviceAccountKey?.project_id}
                    onChange={(value) => {
                       updateServiceAccountKey({
                        ...serviceAccountKey,
                        project_id: value,
                        instance_id: null,
                        database_id: null,
                        graph_name: null,
                       })
                    }}
                    filterOption={(input, option) =>
                    String(option?.children)?.toLowerCase().includes(input.toLowerCase())
                    }>
                    {projectsList.map((proj) => (
                      <Option key={proj.id} value={proj.id}>
                        {proj.name || proj.id} 
                      </Option>
                    ))}
                    </Select>
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={ <> <span>Instance ID </span>  {loading.listProjects &&   <Spin style={{marginLeft:5}} size="small" />} </> }
                name="instance_id"
                rules={[
                  { required: true, message: isADC ? "Please enter or select an instance ID" : "Please select an instance" },
                ]}
              >
                {(() => {
                  const instances = projectsList.find((p) => p.id === serviceAccountKey?.project_id)?.instances || [];
                  const hasInstances = instances.length > 0;
                  
                  if (isADC && !hasInstances) {
                    return (
                      <Input 
                        placeholder="Enter instance ID manually"
                        onChange={(e) => {
                          updateServiceAccountKey({
                            ...serviceAccountKey,
                            instance_id: e.target.value,
                            database_id: null,
                            graph_name: null,
                          });
                        }}
                      />
                    );
                  }
                  
                  return (
                    <Select 
                      style={{ width: "100%" }} 
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.children)?.toLowerCase().includes(input.toLowerCase())
                      }
                      onChange={(value) => {
                        updateServiceAccountKey({
                          ...serviceAccountKey,
                          instance_id: value,
                          database_id: null,
                          graph_name: null,
                        });
                      }}
                    >
                      {instances.map((inst) => (
                        <Option key={inst.id} value={inst.id}>
                          {inst.name || inst.id}
                        </Option>
                      ))}
                    </Select>
                  );
                })()}
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Form.Item
                label= { <> <span>Database ID </span>  {loading.listDatabases &&  <Spin style={{marginLeft:5}} size="small" />} </> }
                name="database_id"
                rules={[
                  { required: true, message: isADC ? "Please enter or select a database ID" : "Please select a database" },
                ]}
              >
                {(() => {
                  const hasDatabases = databases.length > 0;
                  
                  if (isADC && !hasDatabases && !loading.listDatabases) {
                    return (
                      <Input 
                        placeholder="Enter database ID manually"
                        onChange={(e) => {
                          updateServiceAccountKey({
                            ...serviceAccountKey,
                            database_id: e.target.value,
                            graph_name: null,
                          });
                        }}
                      />
                    );
                  }
                  
                  return (
                    <Select 
                      style={{ width: "100%" }} 
                      showSearch
                      onChange={(value) => {
                        updateServiceAccountKey({
                          ...serviceAccountKey,
                          database_id: value,
                          graph_name: null,
                        });
                      }}
                      filterOption={(input, option) =>
                        String(option?.children)?.toLowerCase().includes(input.toLowerCase())
                      }
                      loading={loading.listDatabases}
                      placeholder={loading.listDatabases ? "Loading databases..." : "Select a database"}
                      notFoundContent={loading.listDatabases ? "Loading databases..." : "No databases found"}
                    >
                      {databases.map((db) => (
                        <Option key={db.id} value={db.id}>
                          {db.name || db.id}
                        </Option>
                      ))}
                    </Select>
                  );
                })()}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={ <> <span>Property Graph </span>  {loading.listDatabases &&  <Spin style={{marginLeft:5}} size="small" />} </> }
                name="graph_name"
                rules={[{ required: false }]}
              >
                {(() => {
                  const graphDBs = databases.find((db) => db.id === form.getFieldValue("database_id"))?.graphDBs || [];
                  const hasGraphDBs = graphDBs.length > 0;
                  
                  if (isADC && !hasGraphDBs && !loading.listDatabases) {
                    return (
                      <Input 
                        placeholder="Enter property graph name (optional)"
                        onChange={(e) => {
                          updateServiceAccountKey({
                            ...serviceAccountKey,
                            graph_name: e.target.value,
                          });
                        }}
                      />
                    );
                  }
                  
                  return (
                    <Select 
                      style={{ width: "100%" }} 
                      showSearch
                      onChange={(value) => {
                        updateServiceAccountKey({
                          ...serviceAccountKey,
                          graph_name: value,
                        });
                      }}
                      filterOption={(input, option) =>
                        String(option?.children)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {graphDBs.map((graphDB) => (
                        <Option key={graphDB.id} value={graphDB.id}>
                          {graphDB.name || graphDB.id}
                        </Option>
                      ))}
                      <Option value={""}>No Property Graph</Option>
                    </Select>
                  );
                })()}
              </Form.Item>
            </Col>
          </Row>

          {/* <Card title="Connection Options" size="small" type="inner">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Max Sessions" name="max_sessions">
                  <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Timeout (seconds)" name="timeout">
                  <InputNumber min={1} max={300} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Read Only"
                  name="read_only"
                  valuePropName="checked"
                >
                  <Select style={{ width: "100%" }}>
                    <Option value={false}>No</Option>
                    <Option value={true}>Yes</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card> */}
        </Card>
      )}

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            {initialValues ? "Update Project" : "Create Project"}
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ProjectForm;
