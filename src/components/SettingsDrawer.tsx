import React, { useState } from 'react';
import HelpModal from './HelpModal';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contrastThreshold: number;
  handleContrastSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  simpleMode: boolean;
  toggleSimpleMode: () => void;
  hoverHighlightEnabled: boolean;
  toggleHoverHighlight: () => void;
  linksVisible: boolean;
  toggleLinksVisibility: () => void;
  previewColorsEnabled: boolean;
  togglePreviewColors: () => void;
  lightnessPercentage: number;
  darknessPercentage: number;
  handleLightnessChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDarknessChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  contrastThreshold,
  handleContrastSliderChange,
  simpleMode,
  toggleSimpleMode,
  hoverHighlightEnabled,
  toggleHoverHighlight,
  linksVisible,
  toggleLinksVisibility,
  previewColorsEnabled,
  togglePreviewColors,
  lightnessPercentage,
  darknessPercentage,
  handleLightnessChange,
  handleDarknessChange,
  isDarkMode,
  toggleDarkMode,
}) => {
  const [linkedSliders, setLinkedSliders] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Create wrapper handlers for the sliders
  const handleLinkedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (linkedSliders) {
      // Update both sliders with the same value
      handleLightnessChange(e);
      handleDarknessChange(e);
    } else {
      // Update only the slider that was changed
      if (e.target.id === 'lightnessSlider') {
        handleLightnessChange(e);
      } else {
        handleDarknessChange(e);
      }
    }
  };

  return (
    <>
      <div className={`settings-drawer ${isOpen ? 'open' : ''}`}>
        <button className="close-drawer" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
        
        <div className="drawer-content">
          <h3>Settings</h3>
          
          <div className="settings-group">
            <button
              id="darkModeToggle"
              className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
              onClick={toggleDarkMode}
            >
              <span className="material-icons">
                {isDarkMode ? "dark_mode" : "light_mode"}
              </span>
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>

          <div className="settings-group">
            <button
              id="simpleModeToggle"
              className={`toggle-switch ${!simpleMode ? 'active' : ''}`}
              onClick={toggleSimpleMode}
            >
              <span className="material-icons">{simpleMode ? "unfold_more" : "unfold_less"}</span>
              {simpleMode ? "Advanced Mode" : "Simple Mode"}
            </button>

            <button
              id="linksVisibilityToggle"
              className={`toggle-switch ${linksVisible ? 'active' : ''}`}
              onClick={toggleLinksVisibility}
            >
              <span className="material-icons">{linksVisible ? "visibility" : "visibility_off"}</span>
              {linksVisible ? "Hide Links" : "Show Links"}
            </button>

            <button
              id="hoverHighlightToggle"
              className={`toggle-switch ${hoverHighlightEnabled ? 'active' : ''}`}
              onClick={toggleHoverHighlight}
            >
              <span className="material-icons">{hoverHighlightEnabled ? "highlight" : "highlight_off"}</span>
              {hoverHighlightEnabled ? "Hover Off" : "Hover On"}
            </button>

            <button
              id="previewColorsToggle"
              className={`toggle-switch ${previewColorsEnabled ? 'active' : ''}`}
              onClick={togglePreviewColors}
            >
              <span className="material-icons">{previewColorsEnabled ? "palette" : "format_paint"}</span>
              {previewColorsEnabled ? "Mix Off" : "Mix On"}
            </button>
          </div>

          <div className="settings-group">
            <div className="contrast-control">
              <div className="contrast-header">
                <label htmlFor="contrastSlider">
                  <span className="material-icons">contrast</span> Contrast Ratio
                </label>
                <span className="contrast-value">{contrastThreshold.toFixed(1)}</span>
              </div>
              <input
                type="range"
                id="contrastSlider"
                min="1"
                max="21"
                step="0.1"
                value={contrastThreshold}
                onChange={handleContrastSliderChange}
              />
              <div className="contrast-labels">
                <span>1.0</span>
                <span>21.0</span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="color-variations-control">
              <div className="variations-header">
                <h4>Color Variations</h4>
                <button
                  className={`link-switch ${linkedSliders ? 'active' : ''}`}
                  onClick={() => setLinkedSliders(!linkedSliders)}
                  title={linkedSliders ? "Unlink sliders" : "Link sliders"}
                >
                  <span className="material-icons">
                    {linkedSliders ? "link" : "link_off"}
                  </span>
                </button>
              </div>
              
              <div className="variation-slider">
                <div className="variation-header">
                  <label htmlFor="lightnessSlider">
                    <span className="material-icons">light_mode</span> Lightness
                  </label>
                  <span className="variation-value">{lightnessPercentage}%</span>
                </div>
                <input
                  type="range"
                  id="lightnessSlider"
                  min="0"
                  max="100"
                  value={lightnessPercentage}
                  onChange={handleLinkedChange}
                />
              </div>

              <div className="variation-slider">
                <div className="variation-header">
                  <label htmlFor="darknessSlider">
                    <span className="material-icons">dark_mode</span> Darkness
                  </label>
                  <span className="variation-value">{darknessPercentage}%</span>
                </div>
                <input
                  type="range"
                  id="darknessSlider"
                  min="0"
                  max="100"
                  value={darknessPercentage}
                  onChange={handleLinkedChange}
                />
              </div>
            </div>
          </div>

          <div className="settings-group">
            <button
              className="help-button"
              onClick={() => setIsHelpOpen(true)}
            >
              <span className="material-icons">help_outline</span>
              Help & Instructions
            </button>
          </div>
        </div>
      </div>

      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
};

export default SettingsDrawer; 