import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./App.css";
import axios from "axios";

const style = {
  border: "1px solid black",

  margin: "0px auto",
};

function App() {
  const [family, setFamily] = useState([]);
  const [icons, setIcons] = useState([]);
  const [lines, setLines] = useState([]);

  const [isDragging, setIsDragging] = useState(false);
  const [moveFamily, setMoveFamily] = useState(null);
  const [lastCoord, setLastCoord] = useState({ x: null, y: null });

  const [start, setStart] = useState({ x: null, y: null });

  const canvasRef = useRef();

  useEffect(() => {
    if (canvasRef.current.getContext) {
      // let ctx = canvasRef.current.getContext("2d");
      getFamily();
      getLines();
    } else {
      // canvas-unsupported code here
      // TODO
      alert(
        "Canvas not supported. Please trying accessing using a different browser"
      );
    }
    getIcons();
  }, []);

  useEffect(() => {
    // let ctx = canvasRef.current.getContext("2d");
    // TODO: clear canvas on re-render
    makeElements(family, lines);
  }, [family, lines]);

  const getIcons = () => {
    axios
      .get("http://localhost:3000/icons")
      .then((res) => res.data)
      .then((res) => {
        setIcons(res);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getFamily = () => {
    axios
      .get("http://localhost:3000/family")
      .then((res) => res.data)
      .then((res) => {
        setFamily(res);
        makeElements(res, lines);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getLines = () => {
    axios
      .get("http://localhost:3000/lines")
      .then((res) => res.data)
      .then((res) => {
        setLines(res);
        makeElements(family, res);
        // TODO: makeLines(res)
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const makeElements = (elements, lines) => {
    let ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    elements.map((f, idx) => {
      // console.log({ f });
      let image = document.createElement("img");
      image.src = `./${f.icon}.jpeg`;
      image.addEventListener("load", () => {
        let ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(image, f.x, f.y, 30, 30);
      });
      // ctx.fillStyle = `rgba(0, 0, ${f.x}, 0.5)`;
      // ctx.fillRect(f.x, f.y, 30, 30);
    });
    lines.map((l, idx) => {
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x1, l.y1);
      ctx.stroke();
    });
  };

  const onAddFamily = (x, y, icon) => {
    let newMember = {
      x: x - 15,
      y: y - 15,
      scale: 1,
      angle: 0,
      text: "Testing",
      icon,
    };
    axios
      .post("http://localhost:3000/family", newMember)
      .then((res) => res.data)
      .then((res) => {
        setFamily((family) => [...family, res]);
      })
      .catch((err) => {});
  };

  const onEditFamily = (id, x, y) => {
    axios
      .patch(`http://localhost:3000/family/${id}`, { x: x - 15, y: y - 15 })
      .then((res) => res.data)
      .then((res) => {
        let fam = Array.from(family);
        fam = fam.map((f) => {
          if (f.id === id) return res;
          return f;
        });
        setFamily(fam);
        setMoveFamily(null);
      });
  };

  const onMoveFamily = (id, x, y) => {
    let fam = Array.from(family);
    fam = fam.map((f) => {
      if (f.id === id) return { ...f, x: x - 15, y: y - 15 };
      return f;
    });
    setFamily(fam);
  };

  const removeFamily = (id) => {
    axios
      .delete(`http://localhost:3000/family/${id}`)
      .then((res) => res.data)
      .then(() => {
        let fam = Array.from(family);
        fam = fam.filter((f) => f.id !== id);
        setFamily(fam);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const onAddLine = (x1, y1, type = "simple") => {
    let newLine = {
      x: start.x,
      y: start.y,
      x1,
      y1,
      type,
    };
    axios
      .post("http://localhost:3000/lines", newLine)
      .then((res) => res.data)
      .then((res) => {
        setLines((lines) => [...lines, res]);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const onDoubleClick = (e) => {
    let element;
    if ((element = getElement(e))) {
      if (window.confirm("Are you sure you want to delete this?")) {
        removeFamily(element.id);
      }
    }
  };

  const getElement = (e) => {
    const mouseX = e.clientX - canvasRef.current.getBoundingClientRect().left;
    const mouseY = e.clientY - canvasRef.current.getBoundingClientRect().top;

    return family.find((element) => {
      if (
        mouseX >= element.x &&
        mouseX <= element.x + 30 &&
        mouseY >= element.y &&
        mouseY <= element.y + 30
      )
        return true;
      return false;
    });
  };

  const getCoordinatesBetweenPoints = (x, y, x1, y1, x2, y2) => {
    const coordinates = [];

    // Calculate the distance between the two points
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Determine the number of steps based on the greater distance
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    // Calculate the step size for x and y
    const xStep = dx / steps;
    const yStep = dy / steps;

    // Iterate through the steps and round coordinates to a single decimal place
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x1 + i * xStep * 10);
      const y = Math.round(y1 + i * yStep * 10);
      coordinates.push({ x, y });
    }

    return (
      coordinates.map((c) => c.x).includes(x) ||
      coordinates.map((c) => c.y).includes(y)
    );
  };

  const getLinesTouched = (e) => {
    const mouseX = e.clientX - canvasRef.current.getBoundingClientRect().left;
    const mouseY = e.clientY - canvasRef.current.getBoundingClientRect().top;

    return lines
      .filter((l) =>
        getCoordinatesBetweenPoints(mouseX, mouseY, l.x, l.y, l.x1, l.y1)
      )
      .map((l) => {
        return l.id;
      });
  };

  const dragStartHandler = (e) => {
    e.dataTransfer.setData("icon", e.target.getAttribute("data-icon"));
    e.dataTransfer.dropEffect = "move";
  };

  const dragOverHandler = (e) => {
    e.preventDefault();
  };

  const dropHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    const iconId = e.dataTransfer.getData("icon");
    onAddFamily(x, y, iconId);
  };

  const mouseDownHandler = (e) => {
    let element;
    if ((element = getElement(e))) {
      setIsDragging(true);
      setMoveFamily(element.id);
      setLastCoord({ x: element.x, y: element.y });
    } else {
      console.log("mouse down line");
      let ctx = canvasRef.current.getContext("2d");
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setStart({ x, y });
    }
  };

  const mouseUpHandler = (e) => {
    if (isDragging) {
      setIsDragging(false);
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      onEditFamily(moveFamily, x, y);
    } else {
      console.log("mouse up line");
      let ctx = canvasRef.current.getContext("2d");
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
      if (start.x !== x || start.y !== y) onAddLine(x, y);
    }
  };

  const mouseOutHandler = (e) => {
    if (isDragging) {
      setIsDragging(false);
      onMoveFamily(moveFamily, lastCoord.x + 15, lastCoord.y + 15);
      setLastCoord({ x: null, y: null });
    } else {
    }
  };

  const mouseMoveHandler = (e) => {
    if (isDragging) {
      if (moveFamily) {
        const rect = canvasRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        onMoveFamily(moveFamily, x, y);
      } else {
        let ctx = canvasRef.current.getContext("2d");
        const rect = canvasRef.current.getBoundingClientRect();
      }
    }
  };

  const clickHandler = (e) => {
    if (getLinesTouched(e).length > 0) {
      let lines = getLinesTouched(e);
      console.log(lines);
    }
  };

  // const createNode = (x, y) => {
  //   // Draw a node at (x, y)
  //   let ctx = canvasRef.current.getContext("2d");
  //   ctx.fillStyle = "blue";
  //   ctx.beginPath();
  //   ctx.arc(x, y, 30, 0, Math.PI * 2);
  //   ctx.fill();
  // };

  return (
    <div style={{ display: "flex" }} id="pedigree-canvas">
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <button type="button" onClick={onAddFamily}>
          Add
        </button>
        {icons.map((i, idx) => (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "50%",
            }}
            draggable={true}
            data-icon={i.icon}
            onDragStart={dragStartHandler}
          >
            <img
              src={`./${i.icon}.jpeg`}
              alt={`legend-${i.label}`}
              id={`legend-${i.label}`}
              data-icon={i.icon}
            />
            <span style={{ display: "block" }} data-icon={i.icon}>
              {i.label}
            </span>
          </div>
        ))}
      </div>
      <canvas
        style={style}
        ref={canvasRef}
        height={500}
        width={500}
        onClick={clickHandler}
        onDoubleClick={onDoubleClick}
        onDragOver={dragOverHandler}
        onDrop={dropHandler}
        onMouseDown={mouseDownHandler}
        onMouseMove={mouseMoveHandler}
        onMouseUp={mouseUpHandler}
        onMouseOut={mouseOutHandler}
      ></canvas>
    </div>
  );
}

export default App;
