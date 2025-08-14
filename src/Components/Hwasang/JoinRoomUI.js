import React, { useState, useEffect } from "react";
import { useGroups } from "../../Contexts/GroupContext";
import "./JoinRoomUI.css";
import memoriaLogo from './memoria.png';
import ListItemIcon from '@mui/material/ListItemIcon';

import { 
  Button, Card, CardContent, TextField, Typography, Tooltip, IconButton, 
  Box, Container, Stack, InputAdornment, List, ListItem, ListItemAvatar, Avatar, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

import { green } from '@mui/material/colors';

import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HomeIcon from '@mui/icons-material/Home';
import VideocamIcon from '@mui/icons-material/Videocam';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PublicIcon from '@mui/icons-material/Public';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import RecordingList from "./RecordingList";

const SERVER_URL = "https://hwasang.memoriatest.kro.kr";

// HomeTab 컴포넌트
const HomeTab = ({
  groupList, loadingGroups, roomId, setRoomId,
  localNickname, setLocalNickname, handleJoinRoom,
  participants
}) => {
  const handleRoomSelect = (gid) => setRoomId(gid.toString());
  const handleKeyPress = (e) => { if (e.key === "Enter") handleJoinRoom(); };

  // 한 줄 높이 56px + 패딩 고려 넉넉히!
  return (
    <Card
      raised
      sx={{
        borderRadius: 4,
        boxShadow: 3,
        maxWidth: 800,
        width: '100%',
        mx: 'auto',
        maxHeight: '98vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >

        <Typography variant="h4" fontWeight="bold" gutterBottom>
          내 방 입장하기
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          소속된 방(그룹) 목록입니다.<br />
          원하는 방을 골라 참가하세요!
        </Typography>

        {/* 그룹 리스트: 4줄 확실히 보장 (List/ListItem 패딩 보정) */}
        <Box
          sx={{
            mb: 2,
            minHeight: 56 * 2,
            maxHeight: 288, // 56*4 + 64(여유) = 288, 필요하면 290~300까지 조정 가능
            overflowY: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          {loadingGroups ? (
            <Box sx={{ textAlign: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List disablePadding>
              {groupList.length ? groupList.map(group => {
                const isSelected = group.group_id.toString() === roomId?.toString();
                return (
                  <ListItem
                    button
                    selected={isSelected}
                    key={group.group_id}
                    onClick={() => handleRoomSelect(group.group_id)}
                    disablePadding
                    sx={{
                      minHeight: 56,
                      py: 0,         // 좌우 padding만
                      ...(
                        isSelected ? theme => ({
                          bgcolor: theme.palette.action.selected,
                          borderLeft: `4px solid ${theme.palette.primary.main}`
                        }) : {}
                      )
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: group.isActive ? green[500] : undefined }}>
                        <GroupIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <>
                          방 이름: {group.name || group.group_id}
                          <Box component="span" sx={{ ml: 1, fontWeight: 'medium', color: 'text.secondary' }}>
                            (접속: {group.current_participants ?? 0}명)
                          </Box>
                        </>
                      }
                      secondary={`전체 소속 인원: ${group.member_count}명`}
                    />
                    {isSelected && <CheckCircleIcon color="primary" sx={{ ml: 1 }} />}
                  </ListItem>
                );
              }) : (
                <Typography color="text.secondary" sx={{ px: 2, py: 3 }}>
                  가입된 방이 없습니다.
                </Typography>
              )}
            </List>
          )}
        </Box>

        {/* 참여자 명단: maxHeight 넉넉히 (최대 2줄~3줄까지 스크롤 없이) */}
        {participants && participants.length > 0 && (
          <Box
            sx={{
              mb: 2,
              minHeight: 58,
              maxHeight: 132, // 높이 여유있게, 필요시 더 올려도 OK
              overflowY: 'auto',
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              현재 참여자 ({participants.length}명)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {participants.map(({ peerId, nickname }) => (
                <Box
                  key={peerId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: { xs: '48%', sm: '20%' },
                    minWidth: 100,
                    p: 0.5,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                  }}
                >
                  <Avatar sx={{ mr: 1 }}>
                    <PersonIcon />
                  </Avatar>
                  <Typography noWrap variant="body2">{nickname}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <TextField
          label="닉네임"
          variant="outlined"
          fullWidth
          sx={{ mb: 1 }}
          value={localNickname}
          onChange={e => setLocalNickname(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box display="flex" alignItems="center" justifyContent="flex-start">
          <Typography variant="caption" color="text.secondary">
            발표자 권한은 방 생성 시 자동으로 부여됩니다.
          </Typography>
          <Tooltip title="방에 대한 권한의 등급에 따라 부여됩니다.">
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Button
          variant="contained"
          startIcon={<MeetingRoomIcon />}
          onClick={handleJoinRoom}
          fullWidth
          size="large"
          sx={{ mt: 2, py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
          disabled={!roomId || !localNickname}
        >
          선택한 방 참가하기
        </Button>
      </CardContent>
    </Card>
  );
};

// RecordingTab 컴포넌트 (변경 없음)
const RecordingTab = ({ roomId, setRoomId, groupList }) => (
  <Card raised sx={{ borderRadius: 4, boxShadow: 3 }}>
    <CardContent sx={{ p: 4 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
        녹화 목록
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        아래 드롭다운에서 그룹을 선택하면 해당 회의의 녹화 목록을 볼 수 있습니다.
      </Typography>
      <FormControl fullWidth margin="normal" disabled={groupList.length === 0}>
        <InputLabel id="recording-group-id-label">그룹 선택</InputLabel>
        <Select
          labelId="recording-group-id-label"
          value={roomId ?? ''}
          label="그룹 선택"
          onChange={e => setRoomId(e.target.value)}
          MenuProps={{
            PaperProps: {
              style: { maxHeight: 380 },
            }
          }}
        >
          {groupList.length > 0 ? (
            groupList.map(group => (
              <MenuItem key={group.group_id} value={group.group_id.toString()}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                    <GroupIcon color="primary" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {`방 이름: ${group.name || group.group_id}`}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))
          ) : (
            <MenuItem value="">선택 가능한 그룹이 없습니다</MenuItem>
          )}
        </Select>
      </FormControl>
      <Box
        className="recording-list-wrap"
        sx={{
          mt: 3, p: 1, border: '1px dashed', borderColor: 'grey.300',
          borderRadius: 2, minHeight: 200, width: '100%', maxWidth: '1400px', margin: '0 auto'
        }}
      >
        <RecordingList roomId={roomId} />
      </Box>
    </CardContent>
  </Card>
);


// SettingsTab 컴포넌트 (변경 없음)
const SettingsTab = ({ nickname, subjectId, provider }) => (
  <Card raised sx={{ borderRadius: 4, boxShadow: 3 }}>
    <CardContent sx={{ p: 4 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
        ⚙️ 설정
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        현재 로그인된 사용자 정보입니다.
      </Typography>
      <List sx={{ mt: 3 }}>
        <ListItem>
          <ListItemIcon><PersonIcon /></ListItemIcon>
          <ListItemText primary="닉네임" secondary={nickname || '정보 없음'} />
        </ListItem>
        <ListItem>
          <ListItemIcon><VpnKeyIcon /></ListItemIcon>
          <ListItemText primary="사용자 ID" secondary={subjectId || '정보 없음'} />
        </ListItem>
        <ListItem>
          <ListItemIcon><PublicIcon /></ListItemIcon>
          <ListItemText primary="인증 제공자" secondary={provider || '정보 없음'} />
        </ListItem>
      </List>
    </CardContent>
  </Card>
);

export default function HomeScreen({
  roomId, setRoomId, handleJoinRoom
}) {
  const [activeTab, setActiveTab] = useState("home");
  const { user, sid, provider } = useGroups();
  const [localNickname, setLocalNickname] = useState('');
  const [localSubjectId, setLocalSubjectId] = useState('');
  const [groupList, setGroupList] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  const [participants, setParticipants] = useState([]); // 선택한 방의 현재 참여자 목록 상태

  // 유저 정보 세팅
  useEffect(() => {
    if (user) {
      if (user.nickname) setLocalNickname(user.nickname);
      setLocalSubjectId(sid || user.subject_id);
    }
  }, [user, sid]);

  // 내 참여 그룹 목록 + 방 활성 상태 + 방 접속 인원 수 가져오기
  useEffect(() => {
    if (!localSubjectId) {
      setGroupList([]);
      return;
    }
    setLoadingGroups(true);

    fetch(`${SERVER_URL}/api/user-groups?subject_id=${encodeURIComponent(localSubjectId)}`)
      .then(res => {
        if (!res.ok) throw new Error('네트워크 오류');
        return res.json();
      })
      .then(data => {
        setGroupList(data);
        if (data.length && (!roomId || typeof roomId !== 'string')) {
          setRoomId(data[0].group_id.toString());
          fetchParticipants(data[0].group_id.toString());  // 첫 방 선택시 참여자 목록 조회
        }
      })
      .catch(err => {
        setGroupList([]);
        console.error("방 목록 가져오기 실패", err);
      })
      .finally(() => setLoadingGroups(false));
  }, [localSubjectId, setRoomId, roomId]);

  // 참가자 목록 조회 함수 (REST API 호출)
  const fetchParticipants = async (gid) => {
    if (!gid) {
      setParticipants([]);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/room-participants?groupId=${encodeURIComponent(gid)}`);
      if (!res.ok) throw new Error("참가자 목록 서버 응답 오류");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParticipants(data.participants || []);
    } catch (err) {
      console.error("참가자 목록 조회 실패:", err);
      setParticipants([]);
    }
  };

  // 방 선택 시 집행 (setRoomId와 참가자 목록 갱신)
  const handleRoomSelect = (gid) => {
    setRoomId(gid.toString());
    fetchParticipants(gid);
  };

  // 참가 시 모달 알림 처리
  const handleJoinRoomClick = () => {
    const safeRoomId = roomId ? roomId.toString().trim() : "";
    const safeNickname = localNickname ? localNickname.trim() : "";

    if (!safeRoomId || !safeNickname) {
      setAlertMsg("방을 선택하고 닉네임을 입력해주세요.");
      setAlertOpen(true);
      return;
    }
    handleJoinRoom(safeNickname, localSubjectId, setAlertMsg, setAlertOpen);
  };

  const menuItems = [
    { id: 'home', label: '화상회의', icon: <HomeIcon /> },
    { id: 'recording', label: '녹화 목록', icon: <VideocamIcon /> },
    { id: 'settings', label: '설정', icon: <SettingsIcon /> },
    { id: 'main', label: '메인으로 돌아가기', icon: <ArrowBackIcon />, action: () => window.location.href = "/main" }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab
          groupList={groupList}
          loadingGroups={loadingGroups}
          roomId={roomId?.toString()}
          setRoomId={handleRoomSelect}
          localNickname={localNickname}
          setLocalNickname={setLocalNickname}
          handleJoinRoom={handleJoinRoomClick}
          participants={participants}
        />;
      case 'recording':
        return <RecordingTab roomId={roomId} setRoomId={setRoomId} groupList={groupList} />;
      case 'settings':
        return <SettingsTab nickname={localNickname} subjectId={localSubjectId} provider={provider} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <img src={memoriaLogo} alt="Memoria Logo" className="sidebar-logo" />
          <span className="sidebar-brand">Memoria</span>
        </div>
        <ul className="sidebar-menu">
          {menuItems.map(item => (
            <li
              key={item.id}
              className={`menu-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => item.action ? item.action() : setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main-content">
        {activeTab === "recording" ? (
          <Container maxWidth="xl" sx={{ my: 'auto', px: 0 }}>
            {renderContent()}
          </Container>
        ) : (
          <Container maxWidth="md" sx={{ my: 'auto' }}>
            {renderContent()}
          </Container>
        )}

        {/* 모달 안내 */}
        <Dialog open={alertOpen} onClose={() => setAlertOpen(false)}>
          <DialogTitle>안내</DialogTitle>
          <DialogContent>
            <Typography style={{ whiteSpace: "pre-line" }}>{alertMsg}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAlertOpen(false)} variant="contained" autoFocus>
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </main>
    </div>
  );
}
