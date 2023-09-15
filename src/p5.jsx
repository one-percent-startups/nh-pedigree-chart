import React, { useEffect, useRef, useState } from "react";
import Sketch from "react-p5";
// import p5 from 'p5'
import axios from "axios";

export const P5 = (props) => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [icons, setIcons] = useState([]);

  const [draggedFamilyMember, setDraggedFamilyMember] = useState(null);

  useEffect(() => {
    getIcons();
  }, []);

  const createNode = (p, id, x, y, label, icon) => {
    let img = p.loadImage(`./${icon}.jpeg`);
    return {
      id,
      x,
      y,
      label,
      icon,
      display: function () {
        p.noFill();
        p.stroke(0);
        p.image(img, this.x - 15, this.y - 15, 30, 30);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text(this.label, this.x, this.y + 30);
      },
      contains: function (px, py) {
        const d = p.dist(px, py, this.x, this.y);
        return d < 50;
      },
    };
  };

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

  const getElements = (p) => {
    axios
      .get("http://localhost:3000/family")
      .then((res) => res.data)
      .then((res) => {
        let nodes = res.map((f) =>
          createNode(p, f.id, f.x, f.y, f.text, f.icon)
        );
        setNodes(nodes);
        axios
          .get("http://localhost:3000/lines")
          .then((res) => res.data)
          .then((res) => {
            setConnections(res);
          })
          .catch((err) => {
            console.error("Error getting connections");
          });
      })
      .catch((err) => {
        console.error("Error getting family members");
      });
  };

  const mousePressed = (p5) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const member = nodes[i];
      if (member.contains(p5.mouseX, p5.mouseY)) {
        setDraggedFamilyMember(member);
        break;
      }
    }

    // Remove relationship if a connection is clicked around the center of the line
    for (let i = connections.length - 1; i >= 0; i--) {
      const conn = connections[i];
      const d = p5.dist(
        p5.mouseX,
        p5.mouseY,
        (conn.x + conn.x1) / 2,
        (conn.y + conn.y1) / 2
      );
      if (d < 10) {
        setConnections((prev) => {
          prev.splice(i, 1);
          return prev;
        });
        break;
      }
    }
  };

  function mouseReleased() {
    if (draggedFamilyMember != null) {
      setDraggedFamilyMember(null);
    }
  }

  function mouseDragged(p5) {
    if (draggedFamilyMember != null) {
      setNodes((prev) => {
        let newNodes = prev.map((p) => {
          if (p.id === draggedFamilyMember.id) {
            return { ...p, x: p5.mouseX, y: p5.mouseY };
          }
          return p;
        });
        return newNodes;
      });
    }
  }

  const setup = (p, canvasRef) => {
    getElements(p);
    p.createCanvas(500, 500).parent(canvasRef);
  };

  const draw = (p) => {
    p.background(220);
    p.stroke(0);
    for (let conn of connections) {
      p.line(conn.x, conn.y, conn.x1, conn.y1);
    }

    for (let node of nodes) {
      node.display(p);
    }
  };

  return (
    <div style={{ display: "flex" }} id="pedigree-canvas">
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {/* <button type="button" onClick={onAddFamily}>
          Add
        </button> */}
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
            // onDragStart={dragStartHandler}
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
      <Sketch
        setup={setup}
        draw={draw}
        mouseDragged={mouseDragged}
        mouseReleased={mouseReleased}
        mousePressed={mousePressed}
      />
    </div>
  );
};
