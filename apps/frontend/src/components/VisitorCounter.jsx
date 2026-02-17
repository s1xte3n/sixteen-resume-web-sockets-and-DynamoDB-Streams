import { useState, UseEffect, useEffect } from 'react';
import WebSocketService from '../services/websocket';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;

function VisitorCounter() {
    const [count, setCount] = useState(0);
    const [status, setStatus] = useState('connecting');
    const [wsService] = useState(() => new WebSocketService(WEBSOCKET_URL));

    useEffect(() => {
        // Event listeners
        wsService.on('open', () => {
            setStatus('connected');
        });

        wsService.on('message', (data) => {
            if (data.action === 'updateCount') {
                setCount(data.count);
            }
        });

        wsService.on('close', () => {
            setStatus('disconnected');
        });

        wsService.on('error', () => {
            setStatus('error');
        });

        wsService.on('maxReconnectAttempts', () => {
            setStatus('failed');
        });

        // Connect
        wsService.connect();

        // Cleanup
        return() => {
            wsService.disconnect();
        };
    }, [wsService]);

    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'text-green-500';
            case 'connecting': return 'text-yellow-500';
            case 'disconnected': return 'text-orange-500';
            case 'error':
            case 'failed': return 'text-red-500';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'connected': return '●';
            case 'connecting': return '◐';
            default: return '○';
        }
    };

    return (
        <div className='visitor-counter p-6 bg-white rounded-lg shadow-md'>
            <div className='flex items-center justify-between mb-4'>
                <h2 className='text-2xl font-bold text-gray-800'>Visitor Count</h2>
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                    {getStatusIcon()} {status}
                </span>
            </div>

            <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                    {count.toLocaleString()}
                </div>
                <p className="text-gray-600">
                    {count === 1 ? 'visitor' : 'visitors'} right now
                </p>
            </div>

            {status === 'failed' && (
                <button
                    onClick={() => {
                        wsService.reconnectAttempts = 0;
                        wsService.connect();
                    }}
                    className='mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600'
                >
                    Reconnect
                </button>
            )}
        </div>
    );
}

export default VisitorCounter;
