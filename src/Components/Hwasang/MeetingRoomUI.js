import React, { useRef, useState, useEffect } from "react";
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ModeIcon from '@mui/icons-material/Mode';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import FullMeetingRecorder from "./FullMeetingRecorder";
import "./MeetingRoom.css";

// [삭제] getCanvasPos 함수는 더 이상 필요하지 않으므로 삭제합니다.

export default function MeetingRoomUI({
  peers = [],
  peerNicknames = {},
  localVideoRef,
  micOn = true,
  camOn = false, // camOn의 초기 상태를 Hwasang.js와 일치시킵니다.
  screenOn = false,
  leaveRoom = () => {},
  chatMessages = [],
  sendChatMessage = () => {},
  chatInput = "",
  setChatInput = () => {},
  subtitles = [],
  liveSubtitle = "",
  tab = "chat",
  setTab = () => {},
  isPresenter = false,
  slides = [],
  slidesOpen = true,
  closeSlides = () => {},
  currentSlide = 0,
  prevSlide = () => {},
  nextSlide = () => {},
  handleFileUpload = () => {},
  isDrawingMode = false,
  setIsDrawingMode = () => {},
  isAddingText = false,
  setIsAddingText = () => {},
  canvasRef = { current: null },
  // [수정] Hwasang.js에서 실제 로직이 담긴 함수들을 props로 받습니다.
  startCamera = () => {},
  stopCamera = () => {},
  handleMicToggle = () => {}, 
  startScreenShare = () => {},
  stopScreenShare = () => {},
  nickname = "",
  peerMicOn = {},
  peerScreenOn = {},
  onMutePeer = undefined,
  roomId = "",
  presenterId = "",
  presenterNickname = "",
}) {
  // useEffect 훅으로 body 스타일 제어
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyBackground = document.body.style.background;
    
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#313338';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.background = originalBodyBackground;
    };
  }, []);

  const fileInputRef = useRef();
  const [showControls, setShowControls] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 900, height: 675 });
  const wrapperRef = useRef();
  const [focusMode, setFocusMode] = useState(false);
  
  // [삭제] 2D 캔버스 드로잉 관련 상태들을 모두 삭제합니다.
  // const [drawing, setDrawing] = useState(false);
  // const [lastPos, setLastPos] = useState(null);

  const [camPage, setCamPage] = useState(1);
  const camsPerPage = 5;

  const isMePresenter = presenterId === "me" || presenterId === ""; // 본인이 발표자인지 확인
  const presenterMicOn = isPresenter ? micOn : peerMicOn[presenterId];
  const presenterScreenOn = isPresenter ? screenOn : peerScreenOn[presenterId];

  const showGalleryView = !slidesOpen || slides.length === 0;

  const allCams = [
    {
      id: "me",
      ref: localVideoRef,
      nickname,
      micOn,
      screenOn,
      isLocal: true,
    },
    ...peers.map(peerId => ({
      id: peerId,
      ref: null,
      nickname: peerNicknames[peerId] || peerId,
      micOn: peerMicOn[peerId],
      screenOn: peerScreenOn[peerId],
      isLocal: false,
    }))
  ];

  const camPageCount = Math.ceil(allCams.length / camsPerPage);
  const camPageStart = (camPage - 1) * camsPerPage;
  const camPageEnd = camPage * camsPerPage;
  const camsToShow = allCams.slice(camPageStart, camPageEnd);

  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImgSize({ width: naturalWidth, height: naturalHeight });
  };

  const updateCanvasSize = () => {
    if (!wrapperRef.current || !canvasRef.current || !slides.length) return;
    const maxW = window.innerWidth * (focusMode ? 0.95 : 0.6);
    const maxH = window.innerHeight - 80 - 16;
    let w = imgSize.width;
    let h = imgSize.height;
    if (w > maxW) {
      h = h * (maxW / w);
      w = maxW;
    }
    if (h > maxH) {
      w = w * (maxH / h);
      h = maxH;
    }
    wrapperRef.current.style.width = `${w}px`;
    wrapperRef.current.style.height = `${h}px`;
    
    // Hwasang.js의 fabric 캔버스가 이 ref를 사용하므로, 여기서 사이즈만 설정해줍니다.
    if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
    }
  };

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
    // eslint-disable-next-line
  }, [imgSize, slides, currentSlide, focusMode, slidesOpen]);

  // [삭제] 2D 캔버스 드로잉 이벤트 핸들러들을 모두 삭제합니다. Fabric.js가 처리합니다.
  // handleDraw, handleMouseDown, handleMouseMove, handleMouseUp 등 모두 삭제

  return (
    <div className={`meeting-room-ui ${focusMode ? "focus-mode" : ""}`}>
      <div className="meeting-root">
        <div className="room-id-badge">
          <span role="img" aria-label="room">회의실</span> {roomId || "-"}
        </div>
        <div className="main-content">
          <div className="zoom-center-area">
            <div className="slide-upload-controls">
              {isPresenter && (
                <>
                  <Tooltip title="슬라이드 업로드">
                    <IconButton
                      className="upload-slide-btn"
                      onClick={() => fileInputRef.current?.click()}
                      size="large"
                    >
                      <UploadFileIcon />
                    </IconButton>
                  </Tooltip>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.ppt,.pptx,.jpg,.png"
                    onChange={handleFileUpload}
                  />
                </>
              )}
              <Tooltip title={showControls ? "설정 닫기" : "설정 열기"}>
                <IconButton
                  className="media-controls-toggle"
                  onClick={() => setShowControls((v) => !v)}
                  size="large"
                >
                  {showControls ? <CloseIcon /> : <TuneIcon />}
                </IconButton>
              </Tooltip>
            </div>
            <div className="slide-cam-wrapper">
              {showGalleryView ? (
                <div className="zoom-video-grid">
                  {allCams.map(cam => (
                    <div className="zoom-video-tile" key={cam.id}>
                      {cam.isLocal ? (
                        <video ref={cam.ref} muted autoPlay playsInline />
                      ) : (
                        <div id={`remote-media-${cam.id}`} className="remote-video-container">
                          {/* Hwasang.js에서 이 ID를 가진 컨테이너에 비디오/오디오를 추가합니다. */}
                        </div>
                      )}
                      <div className="zoom-nickname">
                        {cam.nickname}
                        {cam.micOn ? (
                          <MicIcon fontSize="inherit" style={{ color: '#44b700' }} />
                        ) : (
                          <MicOffIcon fontSize="inherit" style={{ color: '#c62828' }} />
                        )}
                        {cam.screenOn && (
                          <ScreenShareIcon fontSize="inherit" style={{ color: '#44b700' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="zoom-slide-wrapper" ref={wrapperRef}>
                    {isPresenter && (
                        <Tooltip title="슬라이드 닫기">
                            <IconButton
                                className="close-slide-btn"
                                onClick={closeSlides}
                                size="large"
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <img
                      src={`https://hwasang.memoriatest.kro.kr/slides/${encodeURIComponent(
                        slides[currentSlide]
                      )}`}
                      alt={`Slide ${currentSlide + 1}`}
                      className="zoom-slide-img"
                      onLoad={onImageLoad}
                      draggable={false}
                    />
                    <canvas
                      ref={canvasRef}
                      className="zoom-slide-canvas"
                      // [삭제] 모든 onMouse... onTouch... 이벤트 핸들러를 삭제합니다.
                    />
                    {isPresenter && (
                      <div className="zoom-slide-controls">
                        <Tooltip title="이전 슬라이드">
                          <span>
                            <IconButton onClick={prevSlide} disabled={currentSlide === 0} size="large">
                              <ArrowBackIosNewIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="다음 슬라이드">
                          <span>
                            <IconButton onClick={nextSlide} disabled={currentSlide === slides.length - 1} size="large">
                              <ArrowForwardIosIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={isDrawingMode ? "그리기 종료" : "그리기"}>
                          <span>
                            <IconButton onClick={() => { setIsDrawingMode((v) => !v); setIsAddingText(false); }} color={isDrawingMode ? "primary" : "default"} size="large">
                              <ModeIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={isAddingText ? "텍스트 종료" : "텍스트"}>
                          <span>
                            <IconButton onClick={() => { setIsAddingText((v) => !v); setIsDrawingMode(false); }} color={isAddingText ? "primary" : "default"} size="large">
                              <TextFieldsIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={focusMode ? "집중 모드 종료" : "집중 모드"}>
                          <IconButton onClick={() => setFocusMode((v) => !v)} color={focusMode ? "primary" : "default"} size="large">
                            <CenterFocusStrongIcon />
                          </IconButton>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                  <div className="presenter-cam-box">
                    {presenterId === nickname ? ( // 본인이 발표자인 경우
                      <video ref={localVideoRef} muted autoPlay playsInline />
                    ) : (
                      <div id={`remote-media-${presenterId}`} className="remote-video-container">
                        {/* 발표자 비디오가 여기에 표시됩니다. */}
                      </div>
                    )}
                    <div className="zoom-nickname">
                      발표자 : {presenterNickname}
                      {presenterMicOn !== undefined ? (
                        presenterMicOn ? (
                          <MicIcon fontSize="inherit" style={{ color: '#44b700' }} />
                        ) : (
                          <MicOffIcon fontSize="inherit" style={{ color: '#c62828' }} />
                        )
                      ) : null}
                      {presenterScreenOn && (
                        <ScreenShareIcon fontSize="inherit" style={{ color: '#44b700' }} />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {!showGalleryView && (
            <div className="zoom-gallery-bar">
              <IconButton
                onClick={() => setCamPage(prev => Math.max(prev - 1, 1))}
                disabled={camPage === 1}
                size="large"
                style={{ color: 'white' }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
          
              <div className="gallery-bar-content">
                {camsToShow.map(cam => (
                  <div className="zoom-video-tile" key={cam.id}>
                    {cam.isLocal ? (
                      <video ref={cam.ref} muted autoPlay playsInline />
                    ) : (
                       <div id={`remote-media-${cam.id}`} className="remote-video-container"></div>
                    )}
                    <div className="zoom-nickname">
                      {cam.nickname}
                      {cam.micOn ? (
                        <MicIcon fontSize="inherit" style={{ color: '#44b700' }} />
                      ) : (
                        <MicOffIcon fontSize="inherit" style={{ color: '#c62828' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
          
              <IconButton
                onClick={() => setCamPage(prev => Math.min(prev + 1, camPageCount))}
                disabled={camPage >= camPageCount}
                size="large"
                style={{ color: 'white' }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </div>
          )}
        </div>
        <aside className="right-panel">
          <div className="tabs">
            <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
              채팅
            </button>
            <button className={tab === "subtitle" ? "active" : ""} onClick={() => setTab("subtitle")}>
              실시간 자막
            </button>
          </div>
          <div className="tab-content">
            {tab === "chat" && (
              <>
                <div className="chat-list">
                  {chatMessages.map((msg, i) => (
                    <div key={i}>
                      <b>{msg.nickname}:</b> {msg.message}
                    </div>
                  ))}
                </div>
                <div className="chat-input-row">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="메시지 입력"
                  />
                  <button onClick={sendChatMessage}>보내기</button>
                </div>
              </>
            )}
            {tab === "subtitle" && (
              <div className="subtitle-list">
                {liveSubtitle && <div className="live-subtitle">{liveSubtitle}</div>}
                {subtitles.map((s, i) => (
                  <div key={i}>
                    <b>{s.peerNickname}:</b> {s.text}
                  </div>
                ))}
              </div>
            )}
          </div>
            <div className="participant-header-tab">참가자 목록 ({peers.length + 1}명)</div>
            <div className="right-participant-list">
              <div>
                나: {nickname}
                {micOn ? <MicIcon fontSize="inherit" /> : <MicOffIcon fontSize="inherit" color="error" />}
                {screenOn && <ScreenShareIcon fontSize="inherit" color="success" />}
              </div>
              {peers.map((peerId) => (
                <div key={peerId}>
                  {peerNicknames[peerId] || peerId}
                  {peerMicOn[peerId] ? <MicIcon fontSize="inherit" /> : <MicOffIcon fontSize="inherit" color="error" />}
                  {peerScreenOn[peerId] && <ScreenShareIcon fontSize="inherit" color="success" />}
                  {isPresenter && (
                    <Tooltip title="참가자 음소거">
                      <IconButton size="small" color="error" style={{ marginLeft: 'auto' }} onClick={() => onMutePeer && onMutePeer(peerId)}>
                        <MicOffIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
        </aside>
        <div className={`media-controls${showControls ? " show" : ""}`}>
          <Tooltip title={micOn ? "마이크 끄기" : "마이크 켜기"}>
            {/* [수정] onClick에 setMicOn 대신 handleMicToggle을 호출합니다. */}
            <IconButton onClick={handleMicToggle} className={micOn ? 'on' : 'off'} size="large">
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={camOn ? "카메라 끄기" : "카메라 켜기"}>
            {/* [수정] onClick에 setCamOn 대신 start/stopCamera를 조건부로 호출합니다. */}
            <IconButton onClick={camOn ? stopCamera : startCamera} className={camOn ? 'on' : 'off'} size="large">
              {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={screenOn ? "화면공유 중지" : "화면공유 시작"}>
            <IconButton onClick={screenOn ? stopScreenShare : startScreenShare} className={screenOn ? 'on' : 'off'} size="large">
              {screenOn ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </Tooltip>
          <div className="recorder-inline">
            <FullMeetingRecorder roomId={roomId} />
          </div>
          <Tooltip title="회의 나가기">
            <IconButton onClick={leaveRoom} className="leave" size="large">
              <ExitToAppIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
