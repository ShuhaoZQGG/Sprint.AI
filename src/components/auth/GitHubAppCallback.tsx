// NOTE: This component requires 'react-router-dom'. Install it with: npm install react-router-dom
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_OAUTH_ENDPOINT = '/api/github/oauth/callback'; // Update if your backend endpoint differs

const GitHubAppCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state'); // repoId
    if (code && state) {
      fetch(BACKEND_OAUTH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.access_token) {
            // Store the token for this repo
            localStorage.setItem(`github_oauth_token_${state}`, data.access_token);
            navigate('/'); // Redirect to main page or wherever appropriate
          } else {
            setError(data.error || 'Failed to get access token');
          }
        })
        .catch(() => setError('Failed to exchange code for token'));
    } else {
      setError('Missing code or state in callback URL');
    }
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-lg font-semibold mb-4">Authorizing with GitHub...</h2>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default GitHubAppCallback; 