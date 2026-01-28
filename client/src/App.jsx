import { Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Team from './pages/Team';
import ProjectDetails from './pages/ProjectDetails';
import TaskDetails from './pages/TaskDetails';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import Clients from './pages/Clients';
import ClientIntake from './pages/ClientIntake';
import MyTasks from './pages/MyTasks';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import { loadAuthFromStorage } from './features/authSlice';
import { useQueryClient } from '@tanstack/react-query';

const App = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user, token, initialized } = useSelector((state) => state.auth);
  const prevUserId = useRef(null);

  useEffect(() => {
    dispatch(loadAuthFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (!initialized) return;
    const nextUserId = user?.id || null;

    if (prevUserId.current && prevUserId.current !== nextUserId) {
      queryClient.clear();
    }

    if (!nextUserId && !token) {
      queryClient.clear();
    }

    if (nextUserId && token) {
      queryClient.invalidateQueries();
    }

    prevUserId.current = nextUserId;
  }, [initialized, user, token, queryClient]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/client-intake" element={<ClientIntake />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="clients" element={<Clients />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projectsDetail" element={<ProjectDetails />} />
          <Route path="taskDetails" element={<TaskDetails />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
