import React from "react";

interface KMeansModalProps {
  previewModalOpen: boolean;
  modalMaxColors: number;
  currentColorList: string[];
  setModalMaxColors: (value: number) => void;
  pendingImageFile: File | null;
  doKmeansPreview: (file: File | null, k: number) => void;
  addColorsFromPreview: () => void;
}

const KMeansModal: React.FC<KMeansModalProps> = ({
  previewModalOpen,
  modalMaxColors,
  currentColorList,
  setModalMaxColors,
  pendingImageFile,
  doKmeansPreview,
  addColorsFromPreview,
}) => {
  if (!previewModalOpen) return null;

  return (
    <div id="previewModal">
      <div id="previewModalContent">
        <h3>Select Number of Colors:</h3>
        <div className="slider-container">
          <label htmlFor="modalMaxColors">Max Colors:</label>
          <input
            type="range"
            id="modalMaxColors"
            min="1"
            max="20"
            step="1"
            value={modalMaxColors}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setModalMaxColors(val);
              doKmeansPreview(pendingImageFile, val);
            }}
          />
          <span id="modalMaxColorsVal">{modalMaxColors}</span>
        </div>
        <div id="previewColors">
          {currentColorList.map((c, idx) => (
            <div
              key={idx}
              className="colorSquare"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div style={{ textAlign: "right", marginTop: "10px" }}>
          <button id="addColorsBtn" onClick={addColorsFromPreview}>
            Add Colors
          </button>
        </div>
      </div>
    </div>
  );
};

export default KMeansModal;
