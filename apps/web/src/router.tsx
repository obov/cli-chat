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