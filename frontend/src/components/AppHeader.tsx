import React from 'react';
import { Layout, Typography, Space, Button, Menu } from 'antd';
import { DatabaseOutlined, ApiOutlined, PlusOutlined, UnorderedListOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header } = Layout;
const { Title } = Typography;

interface AppHeaderProps {
  onLogout?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleDocsClick = () => {
    window.open('/docs', '_blank');
  };

  const menuItems = [
    {
      key: '/listProjects',
      icon: <UnorderedListOutlined />,
      label: 'Projects',
    },
    {
      key: '/addProject',
      icon: <PlusOutlined />,
      label: 'Add Project',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <Header className="app-header">
      <div className="header-content">
        <Space align="center">
          <DatabaseOutlined className="logo-icon" />
          <Title level={3} className="title" style={{color: 'white', margin: 0}}>
            GraphXR Database Proxy
          </Title>
        </Space>
        
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ flex: 1, justifyContent: 'end' }}
        />
        
        <Space>
          <Button 
            type="text" 
            icon={<ApiOutlined />} 
            onClick={handleDocsClick}
            className="header-button"
          >
            API Docs
          </Button>
          {onLogout && (
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={onLogout}
              className="header-button"
              style={{ color: '#ff7875' }}
            >
              Logout
            </Button>
          )}
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;