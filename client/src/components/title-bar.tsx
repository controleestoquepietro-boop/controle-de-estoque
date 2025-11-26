import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI) {
        const maximized = await window.electronAPI.isWindowMaximized();
        setIsMaximized(maximized);
      }
    };

    checkMaximized();
  }, []);

  const handleMinimize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.closeWindow();
    }
  };

  return (
    <div
      className="h-8 bg-gradient-to-r from-red-900 to-red-800 text-white flex items-center justify-between px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Título/Logo */}
      <div className="flex items-center gap-2 text-sm font-semibold flex-1">
        <span className="text-xs bg-red-700 px-2 py-1 rounded">Controle de Estoque</span>
      </div>

      {/* Botões de Controle */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Minimizar */}
        <button
          onClick={handleMinimize}
          className="hover:bg-red-700 p-1 rounded transition-colors duration-200"
          title="Minimizar"
        >
          <Minus size={16} />
        </button>

        {/* Maximizar/Restaurar */}
        <button
          onClick={handleMaximize}
          className="hover:bg-red-700 p-1 rounded transition-colors duration-200"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          <Square size={16} />
        </button>

        {/* Fechar */}
        <button
          onClick={handleClose}
          className="hover:bg-red-600 p-1 rounded transition-colors duration-200"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
