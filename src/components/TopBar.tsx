import React from "react";

interface TopBarProps {
  addNode: () => void;
  eraserActive: boolean;
  toggleEraser: () => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  contrastThreshold: number;
  handleContrastSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  simpleMode: boolean;
  toggleSimpleMode: () => void;
  hoverHighlightEnabled: boolean;
  toggleHoverHighlight: () => void;
  linksVisible: boolean;
  toggleLinksVisibility: () => void;
  onExport: () => void;
  previewColorsEnabled: boolean;
  togglePreviewColors: () => void;
  clearBoard: () => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  showTooltip: (text: string) => void;
  hideTooltip: () => void;
  undoLastAction: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  addNode,
  eraserActive,
  toggleEraser,
  handleFileInput,
  contrastThreshold,
  handleContrastSliderChange,
  simpleMode,
  toggleSimpleMode,
  hoverHighlightEnabled,
  toggleHoverHighlight,
  linksVisible,
  toggleLinksVisibility,
  onExport,
  previewColorsEnabled,
  togglePreviewColors,
  clearBoard,
  isSettingsOpen,
  toggleSettings,
  showTooltip,
  hideTooltip,
  undoLastAction,
}) => {
  const dangerColor = "#dc3545"; // Define the danger color to be consistent

  return (
    <div id="app">
      {/* File Operations Group */}
      <div className="button-group">
        <div className="file-input-wrapper">
          <button 
            className="file-input-button" 
            onClick={() => document.getElementById('fileInput')?.click()}
            onMouseEnter={() => showTooltip("Import Files")}
            onMouseLeave={hideTooltip}
          >
            <span className="material-icons">upload_file</span> Import Files
          </button>
          <input
            type="file"
            id="fileInput"
            accept="image/*,text/*,.html,.css,.js,.json,.md,.txt,.svg"
            onChange={handleFileInput}
          />
        </div>
        <button
          id="exportButton"
          style={{ backgroundColor: "#2196F3" }}
          onClick={onExport}
          onMouseEnter={() => showTooltip("Export Colors")}
          onMouseLeave={hideTooltip}
        >
          <span className="material-icons">download</span> Export Colors
        </button>
      </div>

      {/* Node Operations Group */}
      <div className="button-group">
        <button 
          id="addNode" 
          onClick={addNode}
          onMouseEnter={() => showTooltip("Add Node")}
          onMouseLeave={hideTooltip}
        >
          <span className="material-icons">add</span> Add Node
        </button>
        <button
          id="eraserTool"
          className={`toggle-switch ${eraserActive ? 'active' : ''}`}
          style={{ 
            backgroundColor: eraserActive ? dangerColor : "#666" 
          }}
          onClick={toggleEraser}
          onMouseEnter={() => showTooltip(eraserActive ? "Eraser On" : "Eraser Off")}
          onMouseLeave={hideTooltip}
        >
          <span className="material-icons">auto_fix_high</span>
          {eraserActive ? "Eraser On" : "Eraser Off"}
        </button>
        <button
          id="undoButton"
          style={{ backgroundColor: "#4CAF50" }}
          onClick={undoLastAction}
          onMouseEnter={() => showTooltip("Undo Last Action")}
          onMouseLeave={hideTooltip}
        >
          <span className="material-icons">undo</span> Undo
        </button>
        <button
          id="clearBoard"
          style={{ backgroundColor: dangerColor }}
          onClick={clearBoard}
          onMouseEnter={() => showTooltip("Clear Board")}
          onMouseLeave={hideTooltip}
        >
          <span className="material-icons">delete</span> Clear Board
        </button>
      </div>

      {/* Settings Button */}
      <div className="button-group">
        <button
          id="settingsToggle"
          onClick={toggleSettings}
          onMouseEnter={() => showTooltip("Settings")}
          onMouseLeave={hideTooltip}
        >
          <span className="material-icons">
            {isSettingsOpen ? 'settings' : 'settings'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
