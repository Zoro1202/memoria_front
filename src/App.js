import { Routes, Route } from 'react-router-dom';
import Start from './Start/Start';
import Login from './Login/Login';
import VaultApp from './VaultApp/Vaultapp';
import Main from './Main/Main';
import APITestPage from './Contexts/APIs/APITESTPAGE';
import { GroupsProvider } from './Contexts/GroupContext';
import { NotesProvider } from './Contexts/NotesContext';
import { TabsProvider } from './Contexts/TabsContext';
import Hwasang from './Components/Hwasang/Hwasang';
import React from 'react';
import AiHelper from './Components/AI_Assistance/AiHelper'; // AiHelper를 import 합니다.
import OfflineMeeting from './Components/OfflineMeeting/Meeting';
import './index.css'
// import RecorderPage from './Components/OfflineMeeting/';
// import TranscribePage from './Components/OfflineMeeting/TranscribePage';
// 둘다 없는데여...

export default function App() {
  return (
    <GroupsProvider>
    <NotesProvider>
    <TabsProvider>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vault" element={<VaultApp />} />
        <Route path="/main" element={<Main />} />
        <Route path="/video-conference" element={<Hwasang />} />
        <Route path="/apitest" element={<APITestPage/>} />
        <Route path="/offline-meeting" element={<OfflineMeeting />} />
        {/* <Route path="/record" element={<RecorderPage />} />
        <Route path="/transcribe" element={<TranscribePage />} /> */}

      </Routes>

      <AiHelper />

    </TabsProvider>
    </NotesProvider>
    </GroupsProvider>
  );
}