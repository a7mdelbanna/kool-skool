import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Personal Settings by default
    navigate('/settings/personal', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-lg font-medium mb-2">Redirecting to Personal Settings...</h2>
        <p className="text-muted-foreground">If you are not redirected automatically, please navigate to Personal Settings.</p>
      </div>
    </div>
  );
};

export default Settings;
