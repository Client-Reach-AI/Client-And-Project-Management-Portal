import { Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Team from './pages/Team';
import ProjectDetails from './pages/ProjectDetails';
import TaskDetails from './pages/TaskDetails';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { loadAuthFromStorage } from './features/authSlice';
import { loadWorkspaces } from './features/workspaceSlice';

const App = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadAuthFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(loadWorkspaces());
    }
  }, [dispatch, user]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projectsDetail" element={<ProjectDetails />} />
          <Route path="taskDetails" element={<TaskDetails />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
