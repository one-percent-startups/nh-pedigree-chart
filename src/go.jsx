import React, { useEffect, useRef, useState } from "react";
import * as go from "gojs";
import axios from "axios";

export const Genograph = () => {
  const genogramRef = useRef(null);

  const [diagram, setDiagram] = useState(null);

  const [family, setFamily] = useState([]);
  const [lines, setLines] = useState([]);
  const [icons, setIcons] = useState([
    {
      icon: "proband-male",
      label: "Proband Male",
    },
    {
      icon: "affected-by-history-female",
      label: "ABH Female",
    },
    {
      icon: "affected-by-history-male",
      label: "ABH Male",
    },
    {
      icon: "affected-female",
      label: "Affected female",
    },
    {
      icon: "affected-male",
      label: "Affected male",
    },
    {
      icon: "carrier",
      label: "Carrier",
    },
    {
      icon: "deceased-female",
      label: "Deceased female",
    },
    {
      icon: "deceased-male",
      label: "Deceased male",
    },
    {
      icon: "examined-female",
      label: "Examined female",
    },
    {
      icon: "female",
      label: "Female",
    },
    {
      icon: "lived-one-day",
      label: "Lived one day",
    },
    {
      icon: "male",
      label: "Male",
    },
    {
      icon: "miscarriage",
      label: "Miscarriage",
    },
    {
      icon: "pregnancy",
      label: "Pregnancy",
    },
    {
      icon: "sex-unknown",
      label: "Sex unknown",
    },
    {
      icon: "stillbirth",
      label: "Still birth",
    },
    {
      icon: "two-females",
      label: "Two females",
    },
    {
      icon: "two-males",
      label: "Two males",
    },
  ]);

  useEffect(() => {
    const $ = go.GraphObject.make;

    // Define your genogram nodes, links, and layout here
    let myDiagram = $(go.Diagram, genogramRef.current, {
      "undoManager.isEnabled": true,
    });
    // Enable drag-and-drop from and within the diagram
    myDiagram.toolManager.draggingTool.isGridSnapEnabled = true;
    myDiagram.allowDrop = true;
    setDiagram(myDiagram);

    // Example node:
    myDiagram.nodeTemplate = $(
      go.Node,
      "Vertical", // the Shape will go around the TextBlock
      new go.Binding("location", "location"),
      $(
        go.Picture,
        { height: 30 },
        new go.Binding("source", "icon"),
        new go.Binding("imageAlignment", go.Spot.Center),
        new go.Binding("imageStretch", go.GraphObject.Uniform)
      ),
      $(
        go.TextBlock,
        { name: "relationship" },
        { margin: 3 }, // some room around the text
        // TextBlock.text is bound to Node.data.key
        new go.Binding("text", "text")
      )
    );

    myDiagram.linkTemplate = $(
      go.Link,
      // new go.Binding("routing", "routing"),
      { curve: go.Link.Bezier }, // the whole link panel
      {
        routing: go.Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
        curve: go.Link.JumpOver,
        corner: 10,
      },
      $(
        go.Shape,
        { strokeWidth: 2 }, // Customize the dash array to control the appearance of parallel lines
        new go.Binding("strokeDashArray", "customStyle", function (style) {
          return style === "dashed" ? [6, 3] : [null];
        }),
        {
          doubleClick: function (e, link) {
            console.log({ link });
            // Toggle the link style on double-click
            if (link.data.customStyle === "dashed") {
              link.data.customStyle = "solid";
            } else {
              link.data.customStyle = "dashed";
            }
            // Update the link appearance
            link.updateTargetBindings();
          },
        }
      ),
      $(
        go.Shape, // the arrowhead
        {
          toArrow: "OpenTriangle",
          fill: null,
        }
      )
    );

    // myDiagram.linkTemplate = $(
    //   go.Link,
    //   { routing: go.Link.Orthogonal, corner: 10 },
    //   $(
    //     go.Shape,
    //     { strokeWidth: 2, stroke: "blue" },
    //     {
    //       doubleClick: function (e, link) {
    //         // Toggle the link style on double-click
    //         if (link.data.customStyle === "dashed") {
    //           link.data.customStyle = "solid";
    //         } else {
    //           link.data.customStyle = "dashed";
    //         }
    //         // Update the link appearance
    //         link.updateTargetBindings();
    //       },
    //     }
    //   ),
    //   $(
    //     go.Shape,
    //     { strokeWidth: 2, stroke: "blue" },
    //     new go.Binding("strokeDashArray", "customStyle", function (style) {
    //       return style === "dashed" ? [6, 3] : null;
    //     })
    //   )
    // );

    myDiagram.addDiagramListener("ObjectSingleClicked", (e) => {
      const clickedPart = e.subject.part;
      if (!(clickedPart instanceof go.Node)) return;

      if (myDiagram.model.selectedNodeData) {
        if (myDiagram.model.selectedNodeData.key === clickedPart.data.key) {
        } else {
          const linkData = {
            from: myDiagram.model.selectedNodeData.key,
            to: clickedPart.data.key,
          };
          onAddLines(linkData.from, linkData.to);
          // Deselect the selected node
          myDiagram.model.selectedNodeData = null;
          myDiagram.clearSelection();
        }
        // Create a new link from the selected node to the clicked node
      } else {
        // Select the clicked node for future connections
        myDiagram.model.selectedNodeData = clickedPart.data;
      }
    });

    myDiagram.addDiagramListener("ObjectDoubleClicked", (e) => {
      const clickedPart = e.subject.part;
      if (clickedPart instanceof go.Node) {
        const node = clickedPart;
        const textBlock = node.findObject("relationship");
        // console.log({ textBlock });
        if (textBlock) {
          // Activate the text editing mode
          myDiagram.commandHandler.editTextBlock(textBlock);
        }
      }
    });

    myDiagram.addModelChangedListener((evt) => {
      // if (evt.isTransactionFinished) {
      //   console.log({ evt });
      // }
      if (!evt.isTransactionFinished) return;
      var txn = evt.object; // a Transaction
      if (txn === null) return;
      // iterate over all of the actual ChangedEvents of the Transaction
      txn.changes.each((e) => {
        console.log({ change: e.change });
      });
    });

    getIcons();

    return () => {
      myDiagram.div = null;
    };
  }, []);

  useEffect(() => {
    if (diagram) {
      getElements();
      getLines();
    }
  }, [diagram]);

  const getElements = () => {
    axios
      .get("http://localhost:3000/enrolment")
      .then((res) => res.data)
      .then((res) => {
        try {
          let data = JSON.parse(res.model);
          let family = data.family;
          setFamily(family);
          // diagram.model.fromJSON(res.model);
          family.map((f, idx) => {
            diagram.model.addNodeData(
              createNode(f.icon, f.key, null, null, f.icon)
            );
          });
        } catch (err) {}
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getLines = () => {
    axios
      .get("http://localhost:3000/enrolment")
      .then((res) => res.data)
      .then((res) => {
        try {
          let data = JSON.parse(res.model);
          let lines = data.lines;
          setLines(lines);
          // diagram.model.fromJSON(res.model);
          lines.map((l, idx) => {
            diagram.model.addLinkData(createLink(l.from, l.to));
          });
        } catch (err) {}
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getIcons = () => {
    // axios
    //   .get("http://localhost:3000/icons")
    //   .then((res) => res.data)
    //   .then((res) => {
    //     setIcons(res);
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
  };

  const createNode = (icon, key, x = null, y = null, text = null) => {
    return {
      key,
      loc: `${x} ${y}`,
      text: text || "Uncle",
      icon: `./${icon}.svg`,
      color: "lightblue",
    };
  };

  const createLink = (from, to) => {
    return { from, to };
  };

  const getLargestId = () => {
    return family.length;
  };

  const getLongestId = () => {
    return lines.length;
  };

  const dragStartHandler = (e) => {
    e.dataTransfer.setData("icon", e.target.getAttribute("data-icon"));
    e.dataTransfer.dropEffect = "move";
  };

  const dragOverHandler = (e) => {
    e.preventDefault();
  };

  const dropHandler = (e) => {
    const x = e.clientX - genogramRef.current.getBoundingClientRect().left;
    const y = e.clientY - genogramRef.current.getBoundingClientRect().top;
    e.preventDefault();
    e.stopPropagation();
    const icon = e.dataTransfer.getData("icon");
    onAddFamily(icon, x, y, icon);
  };

  const onAddFamily = (icon, x, y, text) => {
    let newMember = {
      key: getLargestId(),
      icon,
      x,
      y,
      text,
    };
    diagram.model.addNodeData(createNode(icon, newMember.key, x, y, icon));
    setFamily((family) => [...family, newMember]);
  };

  const onAddLines = (from, to) => {
    let newLine = { key: getLongestId(), from, to };
    diagram.model.addLinkData({ from, to });
    setLines((lines) => [...lines, newLine]);
  };

  // const onSave = () => {
  //   axios.put("http://localhost:3000/enrolment", {
  //     model: diagram.model.toJson(),
  //   });
  // };

  const onSave = () => {
    // console.log("saving");
    let data = { family, lines };
    axios.put("http://localhost:3000/enrolment", {
      model: JSON.stringify(data),
    });
  };

  return (
    <div style={{ display: "flex" }} id="pedigree-canvas">
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <button type="button" onClick={onSave}>
          Save
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
              src={`./${i.icon}.svg`}
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
      <div
        ref={genogramRef}
        style={{ width: "100%", height: "500px" }}
        className="flex-1"
        onDragOver={dragOverHandler}
        onDrop={dropHandler}
        onChange={onSave}
      ></div>
    </div>
  );
};
