import { Routes, Route } from 'react-router-dom';
import Start from './Start/Start';
import Login from './Login/Login';
import VaultApp from './VaultApp/Vaultapp';
import Main from './Main/Main';
import HierGraph from './Components/Group/Group';
import APITestPage from './Contexts/APIs/APITESTPAGE';
import { NotesProvider } from './Contexts/NotesContext';
import Hwasang from './Components/Hwasang/Hwasang';
import { TabsProvider } from './Contexts/TabsContext';
import React from 'react';
import AiHelper from './Components/Util/AiHelper'; // AiHelper를 import 합니다.

// 이제 SummaryWidget은 AiHelper 내부에서만 사용되므로 여기서 import 할 필요가 없습니다.
// import SummaryWidget from './Components/Util/SummaryWidget';

export default function App() {
  return (
    <NotesProvider>
      <TabsProvider>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/login" element={<Login />} />
          <Route path="/vault" element={<VaultApp />} />
          <Route path="/main" element={<Main />} />
          <Route path='/group' element={<HierGraph />} />
          <Route path="/video-conference" element={<Hwasang />} />
          <Route path="/apitest" element={<APITestPage/>} />
        </Routes>

        {/* 기존 SummaryWidget을 지우고 AiHelper 컴포넌트를 추가합니다. */}
        <AiHelper />

      </TabsProvider>
    </NotesProvider>
  );
}