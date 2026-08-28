import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Typography,
  message,
  Alert,
  Tooltip,
  Spin,
  Badge,
} from 'antd';
import {
  KeyOutlined,
  CopyOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { projectService, setApiKey as setCachedApiKey } from '../services/projectService';

const { Title, Text, Paragraph } = Typography;

interface SavedSettings {
  api_key: string;
  api_key_enabled: boolean;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyEnabled, setApiKeyEnabled] = useState(false);
  const [apiKeyEnvConfigured, setApiKeyEnvConfigured] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Track the last saved state to detect unsaved changes
  const [savedSettings, setSavedSettings] = useState<SavedSettings>({
    api_key: '',
    api_key_enabled: false,
  });

  // Compute whether there are unsaved changes (only track enabled state, not key)
  const hasUnsavedChanges = useMemo(() => {
    return apiKeyEnabled !== savedSettings.api_key_enabled;
  }, [apiKeyEnabled, savedSettings]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await projectService.getSettings();
      const key = data.api_key || '';
      const enabled = data.api_key_enabled;
      
      setApiKey(key);
      setApiKeyEnabled(enabled);
      setApiKeyEnvConfigured(data.api_key_env_configured);
      
      // Update the cached API key for authenticated requests
      setCachedApiKey(enabled ? key : null);
      
      // Store the saved state
      setSavedSettings({
        api_key: key,
        api_key_enabled: enabled,
      });
    } catch (error) {
      message.error('Failed to load settings');
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await projectService.updateSettings({
        api_key_enabled: apiKeyEnabled,
      });
      const key = data.api_key || '';
      const enabled = data.api_key_enabled;
      
      setApiKey(key);
      setApiKeyEnabled(enabled);
      setApiKeyEnvConfigured(data.api_key_env_configured);
      
      // Update the cached API key for authenticated requests
      setCachedApiKey(enabled ? key : null);
      
      // Update saved state after successful save
      setSavedSettings({
        api_key: key,
        api_key_enabled: enabled,
      });
      
      message.success('Settings saved successfully');
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('Cannot modify settings: API Key is configured via environment variable');
      } else {
        message.error('Failed to save settings');
      }
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      // Generate and save the key in one operation
      const data = await projectService.generateAndSaveApiKey();
      const key = data.api_key || '';
      const enabled = data.api_key_enabled;
      
      setApiKey(key);
      setApiKeyEnabled(enabled);
      setApiKeyEnvConfigured(data.api_key_env_configured);
      setShowApiKey(true);
      
      // Update the cached API key for authenticated requests
      setCachedApiKey(enabled ? key : null);
      
      // Update saved state
      setSavedSettings({
        api_key: key,
        api_key_enabled: enabled,
      });
      
      message.success('New API key generated and saved');
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('Cannot generate key: API Key is configured via environment variable');
      } else {
        message.error('Failed to generate API key');
      }
      console.error('Error generating API key:', error);
    }
  };

  const handleCopyKey = async () => {
    if (apiKey) {
      try {
        await navigator.clipboard.writeText(apiKey);
        message.success('API key copied to clipboard');
      } catch (error) {
        message.error('Failed to copy API key');
      }
    }
  };

  const handleCopyCurlExample = async () => {
    const curlCommand = `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  ${window.location.origin}/api/spanner/YOUR_PROJECT/query \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}'`;
    try {
      await navigator.clipboard.writeText(curlCommand);
      message.success('Curl example copied to clipboard');
    } catch (error) {
      message.error('Failed to copy curl example');
    }
  };

  const isDisabled = apiKeyEnvConfigured;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="settings-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>
        <KeyOutlined style={{ marginRight: 8 }} />
        Settings
      </Title>

      <Card 
        title={
          <Space>
            <span>API Key Authentication</span>
            {hasUnsavedChanges && (
              <Badge 
                count="Unsaved" 
                style={{ 
                  backgroundColor: '#faad14',
                  fontSize: 11,
                }}
              />
            )}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {hasUnsavedChanges && (
          <Alert
            message="You have unsaved changes"
            description="Click 'Save Settings' to apply your changes."
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 24 }}
          />
        )}

        <Alert
          message="About API Key Authentication"
          description="This API key is used by external applications (like GraphXR) to authenticate when querying the database proxy. The frontend management UI does not require authentication."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
        />

        {isDisabled && (
          <Alert
            message="Configuration Locked"
            description="API Key is configured via environment variable (API_KEY) and cannot be changed through this interface."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form layout="vertical">
          <Form.Item label="Enable API Key Authentication">
            <Switch
              checked={apiKeyEnabled}
              onChange={setApiKeyEnabled}
              disabled={isDisabled}
              checkedChildren="Enabled"
              unCheckedChildren="Disabled"
            />
          </Form.Item>

          <Form.Item
            label="API Key"
            extra="Click 'Generate New Key' to create an API key. Keys are automatically saved."
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                style={{ width: 'calc(100% - 88px)' }}
                type={showApiKey ? 'text' : 'password'}
                placeholder="No API key configured - click Generate"
                value={apiKey}
                readOnly
                suffix={
                  apiKey ? (
                    <Tooltip title={showApiKey ? 'Hide' : 'Show'}>
                      <Button
                        type="text"
                        size="small"
                        icon={showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setShowApiKey(!showApiKey)}
                      />
                    </Tooltip>
                  ) : null
                }
              />
              <Tooltip title="Copy API Key">
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyKey}
                  disabled={!apiKey}
                />
              </Tooltip>
              <Tooltip title="Generate New Key">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleGenerateKey}
                  disabled={isDisabled}
                />
              </Tooltip>
            </Space.Compact>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                onClick={handleSave}
                loading={saving}
                disabled={isDisabled || !hasUnsavedChanges}
                style={hasUnsavedChanges ? { 
                  backgroundColor: '#faad14', 
                  borderColor: '#faad14',
                  boxShadow: '0 0 8px rgba(250, 173, 20, 0.5)'
                } : undefined}
              >
                {hasUnsavedChanges ? 'Save Changes' : 'Save Settings'}
              </Button>
              {hasUnsavedChanges && (
                <Button onClick={loadSettings}>
                  Discard Changes
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Example Usage">
        <Paragraph>
          <Text strong>Include the API key in your requests using the X-API-Key header:</Text>
        </Paragraph>
        
        <div style={{ 
          background: '#1e1e1e', 
          padding: 16, 
          borderRadius: 8,
          position: 'relative',
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#d4d4d4',
          overflowX: 'auto'
        }}>
          <Button
            type="primary"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopyCurlExample}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            Copy
          </Button>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  ${window.location.origin}/api/spanner/YOUR_PROJECT/query \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}'`}
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
