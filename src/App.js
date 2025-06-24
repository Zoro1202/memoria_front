import { Routes, Route } from 'react-router-dom';
import Start from './Start/Start';
import Login from './Login/Login';
import VaultApp from './VaultApp/Vaultapp';
import Main from './Main/Main';
import { NotesProvider } from './Contexts/NotesContext';
import { TabsProvider } from './Contexts/TabsContext';

export default function App() {
  return (
    <NotesProvider>
      <TabsProvider>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/login" element={<Login />} />
          <Route path="/vault" element={<VaultApp />} />
          <Route path="/main" element={<Main />} />
        </Routes>
      </TabsProvider>
    </NotesProvider>
  );
}