
import axios from 'axios';
import { BarChart3, Bot, Code2, Database, GitBranch, Send, Sparkles, TrendingUp, User, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Simulateur de l'API backend
const simulateAPICall = async (message, sessionId = null) => {
  try {
    const response = await axios.post('http://localhost:8000/analyze', {
      prompt: message,
      session_id: sessionId
    });
    
    return {
      response_type: 'json',
      response: response.data.response,
      session_id: response.data.session_id
    };
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Fonctions utilitaires corrigées
function getColor(index) {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1',
    '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'
  ];
  return colors[index % colors.length];
}

function interpolateColor(color1, color2, factor) {
  const hex = (color) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const rgb1 = hex(color1);
  const rgb2 = hex(color2);
  
  // Fix: Calcul correct de l'interpolation
  const result = rgb1.map((channel, i) => 
    Math.round(channel + factor * (rgb2[i] - channel))
  );
    
  return `rgb(${result.join(',')})`;
}

// Composant Chart amélioré avec corrections
const Chart = ({ data }) => {
  if (!data?.chart) return null;

  const { chart } = data;
  
  // Fix: Gestion sécurisée du calcul maxValue
  const getAllValues = () => {
    const values = [];
    chart.datasets.forEach(dataset => {
      if (Array.isArray(dataset.data)) {
        dataset.data.forEach(value => {
          if (typeof value === 'object' && value !== null) {
            // Pour scatter plot
            if (typeof value.x === 'number') values.push(value.x);
            if (typeof value.y === 'number') values.push(value.y);
          } else if (typeof value === 'number' && Number.isFinite(value)) {
            values.push(value);
          }
        });
      }
    });
    return values;
  };

  const maxValue = Math.max(...getAllValues()) || 100;

  // Graphique en barres
  if (chart.type === 'bar') {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-xl backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {chart.title}
          </h3>
        </div>
        <div className="space-y-4">
          {chart.labels.map((label, idx) => (
            <div key={label} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{chart.datasets[0].data[idx]}</span>
              </div>
              <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-[2000ms] ease-out relative overflow-hidden group-hover:shadow-lg"
                  style={{ 
                    width: `${(chart.datasets[0].data[idx] / maxValue) * 100}%`,
                    background: `linear-gradient(90deg, ${chart.datasets[0].backgroundColor?.[idx] || '#3b82f6'}, ${chart.datasets[0].backgroundColor?.[idx] || '#3b82f6'}dd)`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-shimmer"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Graphique linéaire
  if (chart.type === 'line') {
    return (
      <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="w-5 h-5 text-indigo-600 animate-bounce" />
          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-800 to-purple-600 bg-clip-text text-transparent">
            {chart.title}
          </h3>
        </div>
        <div className="relative h-64 bg-white rounded-xl p-4 shadow-inner">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={chart.datasets[0].borderColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={chart.datasets[0].borderColor} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            {/* Grid */}
            <pattern id="grid" width="40" height="25" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 25" fill="none" stroke="#e0e7ff" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Area under curve */}
            {chart.datasets.map((dataset, datasetIdx) => {
              const points = dataset.data.map((value, idx) => {
                const x = 50 + (idx * 300) / (dataset.data.length - 1);
                const y = 180 - (value / maxValue) * 160;
                return `${x},${y}`;
              });
              const areaPoints = `50,180 ${points.join(' ')} ${350},180`;
              
              return (
                <polygon
                  key={`area-${datasetIdx}`}
                  points={areaPoints}
                  fill="url(#chartGradient)"
                  className="animate-fade-in"
                />
              );
            })}
            
            {/* Line */}
            {chart.datasets.map((dataset, datasetIdx) => {
              const points = dataset.data.map((value, idx) => {
                const x = 50 + (idx * 300) / (dataset.data.length - 1);
                const y = 180 - (value / maxValue) * 160;
                return `${x},${y}`;
              }).join(' ');
              
              return (
                <polyline
                  key={`line-${datasetIdx}`}
                  fill="none"
                  stroke={dataset.borderColor}
                  strokeWidth="4"
                  points={points}
                  className="animate-draw-line"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            
            {/* Points */}
            {chart.datasets[0].data.map((value, idx) => {
              const x = 50 + (idx * 300) / (chart.datasets[0].data.length - 1);
              const y = 180 - (value / maxValue) * 160;
              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill="white"
                    stroke={chart.datasets[0].borderColor}
                    strokeWidth="3"
                    className="animate-pulse hover:r-8 transition-all cursor-pointer"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="3"
                    fill={chart.datasets[0].borderColor}
                  />
                </g>
              );
            })}
            
            {/* Labels */}
            {chart.labels.map((label, idx) => (
              <text
                key={label}
                x={50 + (idx * 300) / (chart.labels.length - 1)}
                y={195}
                textAnchor="middle"
                className="text-xs fill-gray-600 font-medium"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // Graphique circulaire (Pie)
  if (chart.type === 'pie') {
    const total = chart.datasets[0].data.reduce((a, b) => a + b, 0);
    
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {chart.title}
          </h3>
        </div>
        <div className="relative h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {chart.datasets[0].data.map((value, idx) => {
              const percentage = value / total;
              const angle = percentage * 360;
              const cumulativeAngle = chart.datasets[0].data
                .slice(0, idx)
                .reduce((a, b) => a + (b / total) * 360, 0);
              
              // Fix: Gestion des angles pour éviter les erreurs SVG
              const startAngle = (cumulativeAngle * Math.PI) / 180;
              const endAngle = ((cumulativeAngle + angle) * Math.PI) / 180;
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const x1 = 100 + Math.cos(startAngle) * 80;
              const y1 = 100 + Math.sin(startAngle) * 80;
              const x2 = 100 + Math.cos(endAngle) * 80;
              const y2 = 100 + Math.sin(endAngle) * 80;
              
              return (
                <g key={idx}>
                  <path
                    d={`M 100,100 L ${x1},${y1} A 80,80 0 ${largeArcFlag},1 ${x2},${y2} Z`}
                    fill={chart.datasets[0].backgroundColor?.[idx] || getColor(idx)}
                    className="transition-all duration-500 hover:opacity-90 hover:scale-105 origin-center"
                  />
                  <text
                    x={100 + Math.cos((startAngle + endAngle) / 2) * 50}
                    y={100 + Math.sin((startAngle + endAngle) / 2) * 50}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-medium fill-gray-800"
                  >
                    {Math.round(percentage * 100)}%
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="30" fill="white" />
          </svg>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {chart.labels.map((label, idx) => (
              <div key={label} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: chart.datasets[0].backgroundColor?.[idx] || getColor(idx) }}
                />
                <span className="text-xs text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Heatmap corrigée
  if (chart.type === 'heatmap') {
    const cellSize = 30;
    const legendHeight = 20;
    
    // Fix: Calcul sécurisé des valeurs min/max
    const allValues = chart.datasets.flatMap(d => d.data).filter(v => typeof v === 'number');
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;
    
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {chart.title}
          </h3>
        </div>
        <div className="overflow-auto">
          <svg 
            width={chart.labels.length * cellSize + 100} 
            height={chart.datasets.length * cellSize + legendHeight + 30}
          >
            {/* Légende */}
            <defs>
              <linearGradient id="heatmap-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <rect 
              x={0} 
              y={0} 
              width={chart.labels.length * cellSize} 
              height={legendHeight} 
              fill="url(#heatmap-gradient)"
            />
            <text 
              x={0} 
              y={legendHeight + 15} 
              className="text-xs fill-gray-600"
            >
              Min: {minValue}
            </text>
            <text 
              x={chart.labels.length * cellSize - 30} 
              y={legendHeight + 15} 
              className="text-xs fill-gray-600"
            >
              Max: {maxValue}
            </text>
            
            {/* Heatmap */}
            {chart.datasets.map((dataset, rowIdx) => (
              <g key={rowIdx} transform={`translate(0, ${rowIdx * cellSize + legendHeight + 30})`}>
                <text 
                  x={-5} 
                  y={cellSize / 2} 
                  textAnchor="end" 
                  dominantBaseline="middle" 
                  className="text-xs fill-gray-600"
                >
                  {dataset.label}
                </text>
                {dataset.data.map((value, colIdx) => {
                  // Fix: Normalisation correcte
                  const normalized = (value - minValue) / valueRange;
                  const color = interpolateColor('#f8fafc', '#ef4444', normalized);
                  
                  return (
                    <g key={colIdx} transform={`translate(${colIdx * cellSize}, 0)`}>
                      <rect 
                        width={cellSize - 2} 
                        height={cellSize - 2} 
                        fill={color}
                        rx="4"
                        className="transition-all duration-300 hover:scale-110"
                      />
                      <text 
                        x={cellSize / 2} 
                        y={cellSize / 2} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        className="text-xs font-medium"
                        fill={normalized > 0.6 ? 'white' : '#374151'}
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}
            
            {/* Labels X */}
            <g transform={`translate(0, ${chart.datasets.length * cellSize + legendHeight + 30})`}>
              {chart.labels.map((label, idx) => (
                <text 
                  key={idx}
                  x={idx * cellSize + cellSize / 2} 
                  y={15} 
                  textAnchor="middle" 
                  className="text-xs fill-gray-600"
                >
                  {label}
                </text>
              ))}
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // Radar Chart
  if (chart.type === 'radar') {
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    const axes = chart.labels.length;
    
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {chart.title}
          </h3>
        </div>
        <div className="relative h-80">
          <svg viewBox="0 0 300 300" className="w-full h-full">
            {/* Grille */}
            {[0.25, 0.5, 0.75, 1].map((level, i) => (
              <polygon
                key={i}
                points={Array.from({ length: axes }).map((_, idx) => {
                  const angle = (idx * 2 * Math.PI / axes) - Math.PI / 2;
                  return `${centerX + Math.cos(angle) * radius * level},${centerY + Math.sin(angle) * radius * level}`;
                }).join(' ')}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="0.5"
              />
            ))}
            
            {/* Axes */}
            {chart.labels.map((_, idx) => {
              const angle = (idx * 2 * Math.PI / axes) - Math.PI / 2;
              return (
                <line
                  key={idx}
                  x1={centerX}
                  y1={centerY}
                  x2={centerX + Math.cos(angle) * radius}
                  y2={centerY + Math.sin(angle) * radius}
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                />
              );
            })}
            
            {/* Données */}
            {chart.datasets.map((dataset, i) => {
              const points = dataset.data.map((value, idx) => {
                const angle = (idx * 2 * Math.PI / axes) - Math.PI / 2;
                const scaledValue = (value / maxValue) * radius;
                return `${centerX + Math.cos(angle) * scaledValue},${centerY + Math.sin(angle) * scaledValue}`;
              }).join(' ');
              
              return (
                <g key={i}>
                  <polygon
                    points={points}
                    fill={dataset.backgroundColor || `rgba(99, 102, 241, 0.2)`}
                    stroke={dataset.borderColor || '#6366f1'}
                    strokeWidth="2"
                    className="animate-fade-in"
                  />
                  {dataset.data.map((value, idx) => {
                    const angle = (idx * 2 * Math.PI / axes) - Math.PI / 2;
                    const scaledValue = (value / maxValue) * radius;
                    return (
                      <circle
                        key={idx}
                        cx={centerX + Math.cos(angle) * scaledValue}
                        cy={centerY + Math.sin(angle) * scaledValue}
                        r="4"
                        fill={dataset.borderColor || '#6366f1'}
                        stroke="white"
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    );
                  })}
                </g>
              );
            })}
            
            {/* Labels */}
            {chart.labels.map((label, idx) => {
              const angle = (idx * 2 * Math.PI / axes) - Math.PI / 2;
              const labelRadius = radius + 20;
              return (
                <text
                  key={idx}
                  x={centerX + Math.cos(angle) * labelRadius}
                  y={centerY + Math.sin(angle) * labelRadius}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-600 font-medium"
                >
                  {label}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {chart.datasets.map((dataset, i) => (
            <div key={i} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: dataset.borderColor || '#6366f1' }}
              />
              <span className="text-xs text-gray-700">{dataset.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Scatter Plot
  if (chart.type === 'scatter') {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {chart.title}
          </h3>
        </div>
        <div className="relative h-80">
          <svg viewBox="0 0 400 300" className="w-full h-full">
            {/* Axes */}
            <line x1="50" y1="250" x2="350" y2="250" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="50" y1="250" x2="50" y2="50" stroke="#e2e8f0" strokeWidth="1" />
            
            {/* Grid */}
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={`xgrid-${i}`}>
                <line 
                  x1={50 + (i * 75)} 
                  y1="250" 
                  x2={50 + (i * 75)} 
                  y2="50" 
                  stroke="#f1f5f9" 
                  strokeWidth="0.5" 
                />
                <text 
                  x={50 + (i * 75)} 
                  y="265" 
                  textAnchor="middle" 
                  className="text-xs fill-gray-500"
                >
                  {Math.round(i * (maxValue / 4))}
                </text>
              </g>
            ))}
            
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={`ygrid-${i}`}>
                <line 
                  x1="50" 
                  y1={250 - (i * 50)} 
                  x2="350" 
                  y2={250 - (i * 50)} 
                  stroke="#f1f5f9" 
                  strokeWidth="0.5" 
                />
                <text 
                  x="35" 
                  y={250 - (i * 50)} 
                  textAnchor="end" 
                  dominantBaseline="middle" 
                  className="text-xs fill-gray-500"
                >
                  {Math.round(i * (maxValue / 4))}
                </text>
              </g>
            ))}
            
            {/* Points */}
            {chart.datasets.map((dataset, i) => (
              dataset.data.map((point, j) => (
                <circle
                  key={`point-${i}-${j}`}
                  cx={50 + (point.x / maxValue) * 300}
                  cy={250 - (point.y / maxValue) * 200}
                  r="6"
                  fill={dataset.backgroundColor || '#10b981'}
                  stroke={dataset.borderColor || '#059669'}
                  strokeWidth="1.5"
                  className="transition-all duration-300 hover:r-8"
                />
              ))
            ))}
            
            {/* Légende */}
            <g transform="translate(300, 20)">
              {chart.datasets.map((dataset, i) => (
                <g key={`legend-${i}`} transform={`translate(0, ${i * 20})`}>
                  <circle 
                    cx="5" 
                    cy="5" 
                    r="5" 
                    fill={dataset.backgroundColor || '#10b981'} 
                    stroke={dataset.borderColor || '#059669'}
                  />
                  <text 
                    x="15" 
                    y="7" 
                    className="text-xs fill-gray-600"
                  >
                    {dataset.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 p-6 rounded-xl border border-gray-200 shadow">
      <p className="text-gray-700">Type de graphique non supporté: {chart.type}</p>
      <pre className="text-xs mt-2 p-2 bg-gray-50 rounded overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

// Composant de particules flottantes
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
};


// Composant principal
const GitHubChatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '🚀 Salut ! Je suis votre assistant GitHub Analytics propulsé par l\'IA. Posez-moi des questions sur vos repos, commits, pull requests, ou métriques de qualité !',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await simulateAPICall(inputMessage);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.response,
        responseType: response.response_type,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: error.message || 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    { icon: BarChart3, text: "Compare les commits entre React et Vue", color: "from-blue-500 to-cyan-500", bgColor: "from-blue-50 to-cyan-50" },
    { icon: TrendingUp, text: "Évolution des temps de merge", color: "from-green-500 to-emerald-500", bgColor: "from-green-50 to-emerald-50" },
    { icon: Code2, text: "Qualité du code avec SonarQube", color: "from-purple-500 to-violet-500", bgColor: "from-purple-50 to-violet-50" },
    { icon: Zap, text: "Activité des développeurs ce mois", color: "from-orange-500 to-red-500", bgColor: "from-orange-50 to-red-50" }
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <FloatingParticles />
      
      {/* Header avec effet glassmorphism */}
      <header className="relative bg-white/10 backdrop-blur-xl border-b border-white/20 p-6 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <GitBranch className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              GitHub Analytics Assistant
            </h1>
            <p className="text-blue-200/80 font-medium">Analysez vos données GitHub avec l'IA ✨</p>
          </div>
          <div className="ml-auto hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-green-500/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">En ligne</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages container avec scroll personnalisé */}
      <div className="flex-1 overflow-y-auto p-6 relative" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgb(148 163 184 / 0.5) transparent'
      }}>
        <div className="max-w-6xl mx-auto space-y-8">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`flex space-x-4 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar amélioré */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl relative ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-6 h-6 text-white" />
                  ) : (
                    <>
                      <Bot className="w-6 h-6 text-white" />
                      <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-spin" />
                    </>
                  )}
                </div>

                {/* Message content avec glassmorphism */}
                <div className={`rounded-3xl px-8 py-6 shadow-2xl backdrop-blur-xl relative group ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white border border-white/20' 
                    : 'bg-white/95 border border-gray-200/50'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                  
                  {message.type === 'bot' && message.responseType === 'json' && message.content.chart ? (
                    <div className="space-y-6">
                      <Chart data={message.content} />
                      {message.content.analysis && (
                        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-100 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                          <div className="flex items-start space-x-3">
                            <Database className="w-5 h-5 text-blue-600 mt-1 animate-pulse" />
                            <div>
                              <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                                <span>📊 Analyse Intelligente</span>
                              </h4>
                              <p className="text-gray-700 leading-relaxed">{message.content.analysis}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <p className="leading-relaxed whitespace-pre-wrap font-medium">
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                      </p>
                    </div>
                  )}
                  
                  <div className={`text-xs mt-4 flex items-center space-x-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.type === 'bot' && <Sparkles className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-slide-up">
              <div className="flex space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 flex items-center justify-center shadow-xl">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl px-8 py-6 shadow-2xl border border-gray-200/50">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Questions suggérées avec hover effects */}
      {messages.length <= 1 && (
        <div className="p-6 relative">
          <div className="max-w-6xl mx-auto">
            <p className="text-blue-200 font-medium mb-6 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              💡 Questions suggérées :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(question.text)}
                  className="group p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 hover:border-white/40 hover:bg-white/20 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="flex flex-col space-y-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${question.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <question.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white font-medium group-hover:text-blue-200 transition-colors">
                      {question.text}
                    </span>
                  </div>
                  <div className="mt-3 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded"></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area avec design premium */}
      <div className="relative bg-white/10 backdrop-blur-xl border-t border-white/20 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1 relative group">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question sur GitHub (ex: Compare les commits entre React et Vue...)"
                className="w-full px-6 py-4 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 resize-none text-gray-800 placeholder-gray-500 font-medium shadow-xl group-hover:shadow-2xl"
                rows="1"
                style={{ minHeight: '56px', maxHeight: '120px' }}
                disabled={isLoading}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-3 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 disabled:transform-none font-semibold"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Envoyer</span>
              <Zap className="w-4 h-4 animate-pulse" />
            </button>
          </div>
          <p className="text-blue-200/70 text-sm mt-4 text-center font-medium">
            ⚡ Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes draw-line {
          from { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
          to { stroke-dasharray: 1000; stroke-dashoffset: 0; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        
        .animate-draw-line {
          animation: draw-line 2s ease-in-out;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default GitHubChatbot;