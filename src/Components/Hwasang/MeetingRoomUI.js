import React, { useRef, useState, useEffect } from "react";
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Pagination from '@mui/material/Pagination';
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
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import FullMeetingRecorder from "./FullMeetingRecorder";
import "./MeetingRoom.css";

function getCanvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

export default function MeetingRoomUI({
  peers = [],
  peerNicknames = {},
  joined = true,
  localVideoRef,
  micOn = true,
  setMicOn = () => {},
  camOn = true,
  setCamOn = () => {},
  screenOn = false,
  setScreenOn = () => {},
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
  // [추가됨] useEffect 훅으로 body 스타일 제어
  useEffect(() => {
    // 컴포넌트가 화면에 나타날 때(mount) 원본 스타일을 저장하고 새 스타일을 적용합니다.
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyBackground = document.body.style.background;
    
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#313338';

    // 컴포넌트가 화면에서 사라질 때(unmount) 저장해둔 원본 스타일로 복원합니다.
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.background = originalBodyBackground;
    };
  }, []); // 빈 배열[]: mount와 unmount 시에만 각각 한 번씩 실행되도록 함

  const fileInputRef = useRef();
  const [showControls, setShowControls] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 900, height: 675 });
  const wrapperRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef();

  // 캠 페이지네이션 상태
  const [camPage, setCamPage] = useState(1);
  const camsPerPage = 5;

  // 발표자 마이크/화면공유 상태
  const isMePresenter = presenterId === "me" || presenterId === "";
  const presenterMicOn = isMePresenter ? micOn : peerMicOn[presenterId];
  const presenterScreenOn = isMePresenter ? screenOn : peerScreenOn[presenterId];

  // 갤러리 뷰 조건
  const showGalleryView = !slidesOpen || slides.length === 0;

  // 본인+참가자 배열
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

  // 슬라이드 이미지 로딩 핸들러
  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImgSize({ width: naturalWidth, height: naturalHeight });
  };

  // 캔버스 사이즈 업데이트
  const updateCanvasSize = () => {
    if (!wrapperRef.current || !canvasRef.current) return;
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
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    canvasRef.current.style.width = `${w}px`;
    canvasRef.current.style.height = `${h}px`;
  };

  useEffect(() => {
    updateCanvasSize();
  }, [imgSize, slides, currentSlide, focusMode]);

  useEffect(() => {
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    const bar = document.querySelector(".zoom-gallery-bar");
    if (bar) bar.scrollLeft = 0;
  }, [camPage]);

  useEffect(() => {
    setCamPage(1);
  }, [slidesOpen, slides.length]);

  // --- 발표자만 슬라이드 조작 허용: 핸들러 변경 ---
  const handleDraw = (pos) => {
    if (
      !canvasRef.current ||
      pos.x < 0 ||
      pos.y < 0 ||
      pos.x > canvasRef.current.width ||
      pos.y > canvasRef.current.height
    ) {
      setDrawing(false);
      setLastPos(null);
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    if (lastPos) {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    setLastPos(pos);
  };

  const handleMouseDown = (e) => {
    if (!isPresenter || !isDrawingMode) return;
    setDrawing(true);
    const pos = getCanvasPos(e, canvasRef.current);
    setLastPos(pos);
  };

  const handleMouseMove = (e) => {
    if (!isPresenter || !isDrawingMode || !drawing) return;
    const pos = getCanvasPos(e, canvasRef.current);
    handleDraw(pos);
  };

  const handleMouseUp = () => {
    if (!isPresenter || !isDrawingMode) return;
    setDrawing(false);
    setLastPos(null);
  };

  const handleTouchStart = (e) => {
    if (!isPresenter || !isDrawingMode) return;
    setDrawing(true);
    const pos = getCanvasPos(e, canvasRef.current);
    setLastPos(pos);
  };

  const handleTouchMove = (e) => {
    if (!isPresenter || !isDrawingMode || !drawing) return;
    const pos = getCanvasPos(e, canvasRef.current);
    handleDraw(pos);
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    if (!isPresenter || !isDrawingMode) return;
    setDrawing(false);
    setLastPos(null);
  };

  // 녹화 업로드 함수
  const uploadRecording = async (blob) => {
    try {
      const formData = new FormData();
      formData.append("video", blob, `recording_${Date.now()}.webm`);

      const response = await fetch("https://hwasang.memoriatest.kro.kr/api/upload-recording", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("녹화 파일이 서버에 업로드되었습니다!");
      } else {
        throw new Error("서버 업로드 실패");
      }
    } catch (error) {
      alert("업로드에 실패했습니다: " + error.message);
    }
  };

  // 녹화 버튼 클릭 핸들러
  const handleToggleRecording = () => {
    setIsRecording((prev) => {
      const next = !prev;
      if (next) {
        recorderRef.current?.startRecording();
      } else {
        recorderRef.current?.stopRecording();
      }
      return next;
    });
  };

  return (
    <div className={`meeting-root ${focusMode ? "focus-mode" : ""}`}>
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
                    color="primary"
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
                color={showControls ? "default" : "primary"}
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
                      <video id={`video-${cam.id}`} autoPlay playsInline />
                    )}
                    <div className="zoom-nickname" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {cam.nickname}
                      {cam.micOn ? (
                        <MicIcon fontSize="small" color="primary" style={{ marginLeft: 4 }} />
                      ) : (
                        <MicOffIcon fontSize="small" color="error" style={{ marginLeft: 4 }} />
                      )}
                      {cam.screenOn && (
                        <ScreenShareIcon fontSize="small" color="success" style={{ marginLeft: 4 }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div
                  className={`zoom-slide-wrapper ${focusMode ? "focus" : ""}`}
                  ref={wrapperRef}
                  style={{ position: "relative" }}
                >
                  <Tooltip title="슬라이드 닫기">
                    <IconButton
                      className="slide-close-btn"
                      onClick={closeSlides}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(255,255,255,0.85)",
                        zIndex: 10
                      }}
                      size="large"
                    >
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
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
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  {isPresenter && (
                    <div className="zoom-slide-controls">
                      <Tooltip title="이전 슬라이드">
                        <span>
                          <IconButton
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                            size="large"
                          >
                            <ArrowBackIosNewIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="다음 슬라이드">
                        <span>
                          <IconButton
                            onClick={nextSlide}
                            disabled={currentSlide === slides.length - 1}
                            size="large"
                          >
                            <ArrowForwardIosIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={isDrawingMode ? "그리기 종료" : "그리기"}>
                        <span>
                          <IconButton
                            onClick={() => {
                              setIsDrawingMode((v) => !v);
                              setIsAddingText(false);
                            }}
                            color={isDrawingMode ? "primary" : "default"}
                            size="large"
                          >
                            <ModeIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={isAddingText ? "텍스트 종료" : "텍스트"}>
                        <span>
                          <IconButton
                            onClick={() => {
                              setIsAddingText((v) => !v);
                              setIsDrawingMode(false);
                            }}
                            color={isAddingText ? "primary" : "default"}
                            size="large"
                          >
                            <TextFieldsIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={focusMode ? "집중 모드 종료" : "집중 모드"}>
                        <IconButton
                          onClick={() => setFocusMode((v) => !v)}
                          color={focusMode ? "primary" : "default"}
                          size="large"
                        >
                          <CenterFocusStrongIcon />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                </div>
                <div className="presenter-cam-box">
                  {isMePresenter ? (
                    <video ref={localVideoRef} muted autoPlay playsInline />
                  ) : (
                    <video id={`video-${presenterId}`} autoPlay playsInline />
                  )}
                  <div className="zoom-nickname" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    발표자 : {presenterNickname}
                    {presenterMicOn !== undefined ? (
                      presenterMicOn ? (
                        <MicIcon fontSize="small" color="primary" style={{ marginLeft: 4 }} />
                      ) : (
                        <MicOffIcon fontSize="small" color="error" style={{ marginLeft: 4 }} />
                      )
                    ) : null}
                    {presenterScreenOn && (
                      <ScreenShareIcon fontSize="small" color="success" style={{ marginLeft: 4 }} />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {!showGalleryView && (
          <div className="zoom-gallery-bar" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconButton
              onClick={() => setCamPage(prev => Math.max(prev - 1, 1))}
              disabled={camPage === 1}
              size="large"
            >
              <ArrowBackIosNewIcon />
            </IconButton>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24, flex: 1 }}>
              {camsToShow.map(cam => (
                <div className="zoom-video-tile" key={cam.id}>
                  {cam.isLocal ? (
                    <video ref={cam.ref} muted autoPlay playsInline />
                  ) : (
                    <video id={`video-${cam.id}`} autoPlay playsInline />
                  )}
                  <div className="zoom-nickname" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {cam.nickname}
                    {cam.micOn ? (
                      <MicIcon fontSize="small" color="primary" style={{ marginLeft: 4 }} />
                    ) : (
                      <MicOffIcon fontSize="small" color="error" style={{ marginLeft: 4 }} />
                    )}
                    {cam.screenOn && (
                      <ScreenShareIcon fontSize="small" color="success" style={{ marginLeft: 4 }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <IconButton
              onClick={() => setCamPage(prev => Math.min(prev + 1, camPageCount))}
              disabled={camPage === camPageCount}
              size="large"
            >
              <ArrowForwardIosIcon />
            </IconButton>
            <Pagination
              count={camPageCount}
              page={camPage}
              onChange={(e, value) => setCamPage(value)}
              size="small"
              color="primary"
              style={{ marginLeft: 16 }}
            />
          </div>
        )}
      </div>
      <aside className="right-panel">
        <div className="tabs">
          <button
            className={tab === "chat" ? "active" : ""}
            onClick={() => setTab("chat")}
          >
            채팅
          </button>
          <button
            className={tab === "subtitle" ? "active" : ""}
            onClick={() => setTab("subtitle")}
          >
            실시간 자막
          </button>
        </div>
        <div className="tab-content">
          {tab === "chat" ? (
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
          ) : (
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
        <div className="right-participant-list">
          <div className="participant-header-tab">참가자 목록 ({peers.length + 1}명)</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            <li style={{ display: "flex", alignItems: "center", gap: 4 }}>
              나 {nickname}
              {micOn ? (
                <MicIcon fontSize="small" color="primary" style={{ marginLeft: 4 }} />
              ) : (
                <MicOffIcon fontSize="small" color="error" style={{ marginLeft: 4 }} />
              )}
              {screenOn && (
                <ScreenShareIcon fontSize="small" color="success" style={{ marginLeft: 4 }} />
              )}
            </li>
            {peers.map((peerId) => (
              <li key={peerId} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                참가자 {peerNicknames[peerId] || peerId}
                {peerMicOn[peerId] !== undefined ? (
                  peerMicOn[peerId] ? (
                    <MicIcon fontSize="small" color="primary" style={{ marginLeft: 4 }} />
                  ) : (
                    <MicOffIcon fontSize="small" color="error" style={{ marginLeft: 4 }} />
                  )
                ) : null}
                {peerScreenOn[peerId] && (
                  <ScreenShareIcon fontSize="small" color="success" style={{ marginLeft: 4 }} />
                )}
                {isPresenter && (
                  <Tooltip title="참가자 음소거">
                    <IconButton
                      size="small"
                      color="error"
                      style={{ marginLeft: 8 }}
                      onClick={() => onMutePeer && onMutePeer(peerId)}
                    >
                      <MicOffIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className={`media-controls${showControls ? " show" : ""}`}>
        <Tooltip title={micOn ? "마이크 끄기" : "마이크 켜기"}>
          <IconButton
            onClick={() => setMicOn((v) => !v)}
            color={micOn ? "primary" : "error"}
            size="large"
            style={{ margin: 8 }}
          >
            {micOn ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={camOn ? "카메라 끄기" : "카메라 켜기"}>
          <IconButton
            onClick={() => setCamOn((v) => !v)}
            color={camOn ? "primary" : "error"}
            size="large"
            style={{ margin: 8 }}
          >
            {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={screenOn ? "화면공유 중지" : "화면공유 시작"}>
          <IconButton
            onClick={screenOn ? stopScreenShare : startScreenShare}
            color={screenOn ? "success" : "primary"}
            size="large"
            style={{ margin: 8 }}
          >
            {screenOn ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Tooltip>
        <div className="recorder-inline">
          <FullMeetingRecorder roomId={roomId} />
        </div>
        <Tooltip title="회의 나가기">
          <IconButton
            onClick={leaveRoom}
            color="error"
            size="large"
            style={{ margin: 8 }}
          >
            <ExitToAppIcon />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}

