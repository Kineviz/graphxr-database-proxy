import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Input,
  Button,
  Space,
  Typography,
  message,
  Spin,
  Alert,
} from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Project, APIInfo } from '../types/project';
import { projectService } from '../services/projectService';

const { Title, Text } = Typography;

interface ApiUrlsModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
}

const ApiUrlsModal: React.FC<ApiUrlsModalProps> = ({
  visible,
  project,
  onClose,
}) => {
  const [apiInfo, setApiInfo] = useState<APIInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible && project) {
      loadApiInfo();
    }
  }, [visible, project]);

  const loadApiInfo = async () => {
    if (!project) return;

    setLoading(true);
    setError(null);
    try {
      const info = await projectService.getDatabaseInfo(
        project.database_type,
        project.name
      );
      setApiInfo(info);
    } catch (err) {
      setError('Failed to load API information');
      console.error('Error loading API info:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(label);
      message.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      message.error('Failed to copy to clipboard');
    }
  };

  const getFullUrl = (relativePath: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}${relativePath}`;
  };

  const renderUrlInput = (label: string, relativePath: string, isGet = false, isForGraphXR = false) => {
    const fullUrl = getFullUrl(relativePath);
    const isCopied = copiedUrl === label;

    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong>{label} {isGet ? '(GET)' : '(POST)'} {isForGraphXR ? ' ---- (GraphXR uses the URL)' : ''}</Text>
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={fullUrl}
            readOnly
            style={{ width: 'calc(100% - 40px)' }}
          />
          {isGet && (
            <Button
              type="default" 
              onClick={() => window.open(fullUrl, '_blank')}
            >Open</Button>
          )}
          <Button
            type="primary"
            icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={() => copyToClipboard(fullUrl, label)}
            style={{ width: 40 }}
          />
        </Space.Compact>
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <span>API URLs</span>
          {project && (
            <Text type="secondary">- {project.name}</Text>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={700}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading API information...</div>
        </div>
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {apiInfo && (
        <div>
          <Alert
            message="Integration Guide"
            description="Copy these URLs and use them in GraphXR to connect to your database."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {apiInfo.api_urls.info && 
            renderUrlInput('Database Info API', apiInfo.api_urls.info, true, true)
          }

          {apiInfo.api_urls.query && 
            renderUrlInput('Query API', apiInfo.api_urls.query)
          }

          {apiInfo.api_urls.schema && 
            renderUrlInput('Schema API', apiInfo.api_urls.schema, true)
          }

          {apiInfo.api_urls.graphSchema && 
            renderUrlInput('Graph Schema API', apiInfo.api_urls.graphSchema, true)
          }

           {apiInfo.api_urls.sampleData && 
            renderUrlInput('Sample Data API', apiInfo.api_urls.sampleData, true)
          }


          {apiInfo.version && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Text strong>API Version: </Text>
              <Text code>{apiInfo.version}</Text>
            </Card>
          )}

          <Card size="small" style={{ marginTop: 16 }}>
            <Title level={5}>Usage Example</Title>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
{`// Execute a query
curl -X POST ${getFullUrl(apiInfo.api_urls.query || '')} \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "SELECT * FROM Users LIMIT 10",
    "parameters": {}
  }'`}
            </pre>
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default ApiUrlsModal;