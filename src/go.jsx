import React, { useEffect, useRef, useState } from "react";
import * as go from "gojs";
import axios from "axios";

const icons = [
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
];

export const Genograph = () => {
  const genogramRef = useRef(null);

  const [diagram, setDiagram] = useState(null);

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
      new go.Binding("loc", "loc"),
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
      {
        routing: go.Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
        curve: go.Link.JumpOver,
        corner: 10,
      },
      $(
        go.Shape,
        { strokeWidth: 2 },
        new go.Binding("strokeDashArray", "customStyle", function (style) {
          return style === "dashed"
            ? [3, 6]
            : style === "dotted"
            ? [1, 3]
            : style === "long"
            ? [6, 3]
            : [];
        })
      ),
      $(
        go.Shape, // the arrowhead
        {
          toArrow: "OpenTriangle",
          fill: null,
        }
      )
    );

    myDiagram.addDiagramListener("ObjectSingleClicked", (e) => {
      const clickedPart = e.subject.part;
      if (!(clickedPart instanceof go.Node)) return;

      if (myDiagram.model.selectedNodeData) {
        if (myDiagram.model.selectedNodeData.key === clickedPart.data.key) {
        } else {
          const linkData = {
            key: getLongestId(),
            from: myDiagram.model.selectedNodeData.key,
            to: clickedPart.data.key,
          };
          myDiagram.model.addLinkData(linkData);
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
      } else if (clickedPart instanceof go.Link) {
        const link = clickedPart;
        const model = link.diagram.model;
        if (model) {
          // Toggle the customStyle property between 'dashed' and 'parallel'
          model.startTransaction("updateLinkStyle");
          let customStyle = link.data.customStyle,
            setStyle = "dotted";
          if (customStyle === "dashed") {
          } else {
            if (customStyle === "dotted") {
              setStyle = "long";
            } else {
              if (customStyle === "long") {
                setStyle = "normal";
              } else {
                setStyle = "dashed";
              }
            }
          }
          console.log(customStyle, setStyle);
          model.setDataProperty(link.data, "customStyle", setStyle);
          model.commitTransaction("updateLinkStyle");
        }
      }
    });

    myDiagram.addDiagramListener("TextEdited", (e) => {
      const part = e.subject;
      if (part instanceof go.TextBlock) {
        const node = part.part;
        const model = node.diagram.model;
        if (model) {
          // Update the data in the model with the new text
          model.startTransaction("updateNodeText");
          model.setDataProperty(node.data, "text", part.text);
          model.commitTransaction("updateNodeText");
        }
      }
    });

    myDiagram.addDiagramListener("SelectionMoved", (e) => {
      const model = e.diagram.model;
      e.diagram.selection.each(function (node) {
        // Check if the node is in the model
        if (node.data && model) {
          // Store the node's new location in the node's data
          model.setDataProperty(
            node.data,
            "loc",
            go.Point.stringify(node.location)
          );
        }
      });
    });

    // myDiagram.addModelChangedListener((evt) => {
    //   // if (evt.isTransactionFinished) {
    //   //   console.log({ evt });
    //   // }
    //   if (!evt.isTransactionFinished) return;
    //   var txn = evt.object; // a Transaction
    //   if (txn === null) return;
    //   // iterate over all of the actual ChangedEvents of the Transaction
    //   txn.changes.each((e) => {
    //     console.log({ change: e.change, e });
    //   });
    // });

    axios
      .get("http://localhost:3000/enrolment")
      .then((res) => res.data)
      .then((res) => {
        try {
          let model = JSON.parse(res.model);
          console.log({ model });
          myDiagram.model = go.Model.fromJson(model);
        } catch (err) {
          console.error({ err });
        }
      })
      .catch((err) => {});

    return () => {
      myDiagram.div = null;
    };
  }, []);

  const getLargestId = () => {
    return diagram.model.nodeDataArray.length || 0;
  };

  const getLongestId = () => {
    return diagram.model.linkDataArray.length || 0;
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
    let newMember = {
      key: getLargestId(),
      loc: `${x} ${y}`,
      text: icon || "enter relationship here",
      icon: `./${icon}.svg`,
      color: "lightblue",
    };
    diagram.model.addNodeData(newMember);
  };

  const onSave = () => {
    axios.put("http://localhost:3000/enrolment", {
      model: diagram.model.toJson(),
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
      <div style={{ width: "100%", height: "500px", position: "relative" }}>
        <div
          class="legend-container"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
          }}
        >
          <h3>Legends</h3>
          <div class="legend-item">
            <div class="legend-line solid"></div>
            <span>Marriage</span>
          </div>

          <div class="legend-item">
            <div class="legend-line long-dashed"></div>
            <span>Divorced or separation</span>
          </div>
          <div class="legend-item">
            <div class="legend-line dotted"></div>
            <span>Extramarital mating</span>
          </div>
          <div class="legend-item">
            <div class="legend-line dashed"></div>
            <span>Consanguineous marriage</span>
          </div>
        </div>
        <div
          ref={genogramRef}
          style={{ width: "100%", height: "100%" }}
          onDragOver={dragOverHandler}
          onDrop={dropHandler}
          onChange={onSave}
        ></div>
      </div>
    </div>
  );
};
