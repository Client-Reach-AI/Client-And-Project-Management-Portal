import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../features/authSlice';
import toast from 'react-hot-toast';

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

export function useInactivityLogout(enabled = true) {
  const dispatch = useDispatch();
  const timeoutRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      dispatch(logout());
      toast.error('You have been logged out due to inactivity.');
    }, IDLE_TIMEOUT_MS);
  }, [dispatch, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    resetTimer();

    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, enabled]);
}
