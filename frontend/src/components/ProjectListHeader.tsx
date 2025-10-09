import React from 'react';
import { Card, Button, Typography, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const ProjectListHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Database Projects
        </Title>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/addProject')}
            size="large"
          >
            Create New Project
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default ProjectListHeader;