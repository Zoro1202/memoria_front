// src/Components/Hwasang/Whiteboard.js (최종 수정된 코드)

import React, { useEffect, useRef } from "react";
import { Canvas, Path, Image, PencilBrush, IText, util } from "fabric";

function generateUniqueId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const Whiteboard = React.forwardRef(
  (
    {
      socket,
      roomId,
      slides,
      currentSlide,
      slideDrawings,
      setSlideDrawings,
      isDrawingMode,
      isAddingText,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const isDrawingModeRef = useRef(isDrawingMode);
    const isAddingTextRef = useRef(isAddingText);
    const currentSlideRef = useRef(currentSlide);
    const roomIdRef = useRef(roomId);

    useEffect(() => { isDrawingModeRef.current = isDrawingMode; }, [isDrawingMode]);
    useEffect(() => { isAddingTextRef.current = isAddingText; }, [isAddingText]);
    useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

    React.useImperativeHandle(ref, () => ({
      saveCurrentSlideDrawing: () => {
        if (fabricCanvasRef.current) {
          const canvasJSON = fabricCanvasRef.current.toJSON(['id']);
          setSlideDrawings((prev) => ({
            ...prev,
            [currentSlideRef.current]: canvasJSON,
          }));
        }
      },
    }));

    useEffect(() => {
      if (!socket) return;
      
      const handleDrawPath = ({ roomId: rId, path, slideIndex }) => {
        if (rId !== roomIdRef.current || slideIndex !== currentSlideRef.current || !fabricCanvasRef.current || !path) return;
        const canvas = fabricCanvasRef.current;
        if (path.type !== "path" && path.type !== "Path") return;
        
        const { id, path: pathData, ...safeProps } = JSON.parse(JSON.stringify(path));
        let obj = canvas.getObjects().find(o => o.id === id);
        if (!obj) {
          const uniqueId = id && !canvas.getObjects().some(o => o.id === id) ? id : generateUniqueId();
          obj = new Path(pathData, { ...safeProps, id: uniqueId });
          canvas.add(obj);
        }
        canvas.renderAll();
      };
      
      const handleDrawText = ({ roomId: rId, textObj, slideIndex }) => {
        if (rId !== roomIdRef.current || slideIndex !== currentSlideRef.current || !fabricCanvasRef.current || !textObj) return;
        const canvas = fabricCanvasRef.current;
        
        let obj = canvas.getObjects().find(o => o.id === textObj.id);
        if (obj) {
            obj.set(textObj);
        } else {
            const uniqueId = textObj.id && !canvas.getObjects().some(o => o.id === textObj.id) ? textObj.id : generateUniqueId();
            util.enlivenObjects([textObj], (objects) => {
                objects.forEach(o => {
                    o.id = uniqueId;
                    canvas.add(o);
                });
                canvas.renderAll();
            });
        }
        canvas.renderAll();
      };

      const handleRemoveObject = ({ roomId: rId, objId, slideIndex }) => {
        if (rId !== roomIdRef.current || slideIndex !== currentSlideRef.current || !fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;
        const obj = canvas.getObjects().find(o => o.id === objId);
        if (obj) {
          canvas.remove(obj);
          canvas.renderAll();
        }
      };

      socket.on("draw-path", handleDrawPath);
      socket.on("draw-text", handleDrawText);
      socket.on("remove-object", handleRemoveObject);

      return () => {
        socket.off("draw-path", handleDrawPath);
        socket.off("draw-text", handleDrawText);
        socket.off("remove-object", handleRemoveObject);
      };
    }, [socket]);

    useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();

      const fabricCanvas = new Canvas(canvasEl, {
        isDrawingMode: isDrawingModeRef.current,
        backgroundColor: "transparent",
        selection: true,
      });
      fabricCanvasRef.current = fabricCanvas;

      const slideUrl = slides[currentSlide];
      if (slideUrl) {
          Image.fromURL(slideUrl, (img) => {
            const container = canvasEl.parentElement;
            if (container) {
                const { clientWidth, clientHeight } = container;
                const scale = Math.min(clientWidth / img.width, clientHeight / img.height);
                fabricCanvas.setWidth(img.width * scale);
                fabricCanvas.setHeight(img.height * scale);
                fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
                    scaleX: scale,
                    scaleY: scale
                });
            }
          }, { crossOrigin: 'anonymous' });
      }

      const drawingData = slideDrawings[currentSlide];
      if (drawingData) {
        fabricCanvas.loadFromJSON(drawingData, () => {
          fabricCanvas.getObjects().forEach(obj => {
            if (!obj.id) obj.id = generateUniqueId();
          });
          fabricCanvas.renderAll();
        });
      }
      
      const brush = new PencilBrush(fabricCanvas);
      brush.width = 3;
      brush.color = "#ff3333";
      fabricCanvas.freeDrawingBrush = brush;

      const handlePathCreated = (e) => {
        if (!isDrawingModeRef.current) return;
        const path = e.path;
        path.id = generateUniqueId();
        socket.emit("draw-path", {
          roomId: roomIdRef.current,
          path: path.toObject(['id']), // [수정] .toObject(['id']) 사용
          slideIndex: currentSlideRef.current,
        });
      };

      const handleObjectModified = (e) => {
        const obj = e.target;
        if (obj && (obj.type === "i-text" || obj.type === "Path")) {
          const eventName = obj.type === 'i-text' ? "draw-text" : "draw-path";
          const payloadKey = obj.type === 'i-text' ? 'textObj' : 'path';
          socket.emit(eventName, {
              roomId: roomIdRef.current,
              [payloadKey]: obj.toObject(['id']), // [수정] .toObject(['id']) 사용
              slideIndex: currentSlideRef.current,
          });
        }
      };

      const handleObjectRemoved = (obj) => {
          if (obj && obj.id) {
            socket.emit("remove-object", {
              roomId: roomIdRef.current,
              objId: obj.id,
              slideIndex: currentSlideRef.current,
            });
          }
      };
      
      fabricCanvas.on("path:created", handlePathCreated);
      fabricCanvas.on("object:modified", handleObjectModified);

      const onKeyDown = (e) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          const activeObjects = fabricCanvas.getActiveObjects();
          if (activeObjects.length > 0) {
            activeObjects.forEach(obj => {
                handleObjectRemoved(obj);
                fabricCanvas.remove(obj);
            });
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
          }
        }
      };
      window.addEventListener("keydown", onKeyDown);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      };
    }, [currentSlide, slides]);

    useEffect(() => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas) return;

        fabricCanvas.isDrawingMode = isDrawingMode;
        
        const onMouseDown = (options) => {
            if (!isAddingTextRef.current || fabricCanvas.isDrawingMode) return;
            const pointer = fabricCanvas.getPointer(options.e);
            const text = new IText("텍스트 입력", {
                left: pointer.x,
                top: pointer.y,
                fontSize: 20,
                fill: "#000000",
                id: generateUniqueId(),
            });
            fabricCanvas.add(text);
            fabricCanvas.setActiveObject(text);
            text.enterEditing();
            text.selectAll();
            fabricCanvas.renderAll();

            socket.emit("draw-text", {
                roomId: roomIdRef.current,
                textObj: text.toObject(['id']), // [수정] .toObject(['id']) 사용
                slideIndex: currentSlideRef.current,
            });
        };

        if (isAddingText) {
            fabricCanvas.on("mouse:down", onMouseDown);
        } else {
            fabricCanvas.off("mouse:down", onMouseDown);
        }

        return () => {
            if (fabricCanvas) {
                fabricCanvas.off("mouse:down", onMouseDown);
            }
        };
    }, [isDrawingMode, isAddingText, socket]);

    return (
      <div className="whiteboard-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
          <canvas ref={canvasRef} />
      </div>
    );
  }
);

export default Whiteboard;
