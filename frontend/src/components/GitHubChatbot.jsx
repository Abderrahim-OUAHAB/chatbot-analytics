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
    throw new Error(error);}
};

// Composant Chart amélioré avec animations
const Chart = ({ data }) => {
  if (!data?.chart) return null;

  const { chart } = data;
  const maxValue = Math.max(...chart.datasets.flatMap(d => d.data));

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
            {chart.datasets.map((dataset) => {
              const points = dataset.data.map((value, idx) => {
                const x = 50 + (idx * 300) / (dataset.data.length - 1);
                const y = 180 - (value / maxValue) * 160;
                return `${x},${y}`;
              });
              const areaPoints = `50,180 ${points.join(' ')} ${350},180`;
              
              return (
                <polygon
                  key="area"
                  points={areaPoints}
                  fill="url(#chartGradient)"
                  className="animate-fade-in"
                />
              );
            })}
            
            {/* Line */}
            {chart.datasets.map((dataset) => {
              const points = dataset.data.map((value, idx) => {
                const x = 50 + (idx * 300) / (dataset.data.length - 1);
                const y = 180 - (value / maxValue) * 160;
                return `${x},${y}`;
              }).join(' ');
              
              return (
                <polyline
                  key="line"
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

  return null;
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