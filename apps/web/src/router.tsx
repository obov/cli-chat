import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './routes/_layout';
import ChatPage from './routes/_index';
import SettingsPage from './routes/settings';
import HistoryPage from './routes/history';
import { api } from './lib/api';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ChatPage />,
        loader: async () => {
          try {
            const [session, tools] = await Promise.all([
              api.getSession(),
              api.getTools()
            ]);
            return { session, tools };
          } catch (error) {
            console.error('Failed to load initial data:', error);
            return { session: null, tools: [] };
          }
        },
      },
      {
        path: 'settings',
        element: <SettingsPage />,
        action: async ({ request }) => {
          const formData = await request.formData();
          return api.updateSettings(formData);
        },
      },
      {
        path: 'history',
        element: <HistoryPage />,
        loader: async () => {
          return api.getChatHistory();
        },
      },
    ],
  },
]);