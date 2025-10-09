import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import ProjectManagement from './pages/ProjectManagement';
import './styles/App.css';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout className="app-layout">
      <AppHeader />
      <Content className="app-content">
        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<ProjectManagement />} />
            <Route path="/listProjects" element={<ProjectManagement />} />
            <Route path="/addProject" element={<ProjectManagement />} />
            <Route path="/editProject/:projectId" element={<ProjectManagement />} />
            <Route path="/admin" element={<ProjectManagement />} />
            <Route path="/projects" element={<ProjectManagement />} />
          </Routes>
        </div>
      </Content>
    </Layout>
  );
};

export default App;