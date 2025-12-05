
import React, { useState } from 'react';
import { ChevronRight, FileCheck, FileText, GripVertical, LogOut } from 'lucide-react';
import { CONTRACT_FIELDS, MOCK_OCR_DATA } from '../../../types/types';

export const MappingStep: React.FC<{ mappings: Record<string, string>, onMap: (fieldId: string, value: string) => void, ocrData?: any }> = ({ mappings, onMap, ocrData }) => {
  const [draggedData, setDraggedData] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  
  const displayData = ocrData || MOCK_OCR_DATA;

  // Recursive function to render JSON tree
  const renderJsonTree = (data: any, prefix = '') => {
      return Object.entries(data).map(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null) {
              return (
                  <div key={fullKey} className="ml-2 mb-2">
                     <details open className="group">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-primary list-none flex items-center gap-1">
                            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                            {key.toUpperCase().replace(/_/g, ' ')}
                        </summary>
                        <div className="pl-2 border-l-2 border-slate-200 mt-2">
                             {renderJsonTree(value, fullKey)}
                        </div>
                     </details>
                  </div>
              )
          }
          
          return (
              <div 
                key={fullKey}
                draggable
                onDragStart={(e) => {
                    setDraggedData(String(value));
                    e.dataTransfer.setData('text/plain', String(value));
                    e.dataTransfer.effectAllowed = 'copy';
                }}
                onDragEnd={() => setDraggedData(null)}
                className="ml-6 mb-2 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded cursor-grab active:cursor-grabbing hover:bg-white hover:shadow-md transition-all"
              >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col pointer-events-none">
                    <span className="text-[10px] uppercase text-slate-400 font-bold">{key}</span>
                    <span className="text-sm text-slate-800 font-medium truncate max-w-[180px]" title={String(value)}>{String(value)}</span>
                  </div>
              </div>
          );
      })
  }

  return (
    <div className="h-[600px] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
       {/* Left: OCR Source */}
       <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" />
                    Dados Extraídos (OCR)
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {renderJsonTree(displayData)}
            </div>
       </div>

       {/* Right: Contract Target */}
       <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" />
                    Campos do Contrato
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {CONTRACT_FIELDS.map(field => (
                    <div 
                        key={field.id}
                        onDragOver={(e) => { 
                            e.preventDefault(); 
                            e.dataTransfer.dropEffect = 'copy';
                            // Robustness: Ensure state is active during hover
                            if (activeDropZone !== field.id) setActiveDropZone(field.id);
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setActiveDropZone(field.id);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            // Only clear if we are actually leaving the container, not entering a child
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            setActiveDropZone(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setActiveDropZone(null);
                            const val = e.dataTransfer.getData('text/plain');
                            if (val) onMap(field.id, val);
                        }}
                        className={`
                            p-3 rounded-lg border-2 transition-all duration-200 relative
                            ${mappings[field.id] 
                                ? 'bg-blue-50/50 border-primary border-solid' 
                                : activeDropZone === field.id
                                    ? 'bg-blue-50 border-blue-400 border-dotted scale-[1.02] shadow-sm ring-2 ring-blue-100 z-10'
                                    : 'border-slate-300 border-dashed bg-transparent'
                            }
                        `}
                    >
                        {/* Pointer events none on label ensures drag events bubble to parent div */}
                        <span className="text-xs font-bold text-slate-500 uppercase mb-1 block pointer-events-none">{field.label}</span>
                        
                        {mappings[field.id] ? (
                            <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-blue-100">
                                <span className="font-semibold text-primary truncate max-w-[200px] pointer-events-none">{mappings[field.id]}</span>
                                <button onClick={() => onMap(field.id, '')} className="text-red-400 hover:text-red-600 p-1 z-20 relative">
                                    <LogOut className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        ) : (
                            <div className={`h-8 flex items-center text-sm italic transition-colors pointer-events-none ${activeDropZone === field.id ? 'text-primary font-medium' : 'text-slate-400'}`}>
                                {activeDropZone === field.id ? 'Soltar para mapear!' : 'Arraste um dado aqui...'}
                            </div>
                        )}
                        
                        {/* Invisible overlay to help capture drag events if needed */}
                        {activeDropZone === field.id && <div className="absolute inset-0 bg-blue-400/5 pointer-events-none rounded-lg" />}
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
