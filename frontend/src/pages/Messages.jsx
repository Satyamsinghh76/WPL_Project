import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import * as API from '../api';

export default function Messages({ currentUser, authHeaders, onAuthExpired }) {
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('userId');
    const [initialConversation, setInitialConversation] = useState(null);
    const [isResolvingConversation, setIsResolvingConversation] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const createOrGetConversation = async () => {
            if (!currentUser?.token || !targetUserId) {
                setInitialConversation(null);
                setIsResolvingConversation(false);
                return;
            }

            const parsedUserId = Number(targetUserId);
            if (!Number.isFinite(parsedUserId) || parsedUserId === currentUser.id) {
                setInitialConversation(null);
                setIsResolvingConversation(false);
                return;
            }

            setIsResolvingConversation(true);
            try {
                const convo = await API.startConversation(parsedUserId, authHeaders(true));
                if (!cancelled) {
                    setInitialConversation(convo);
                }
            } catch {
                if (!cancelled) {
                    setInitialConversation(null);
                }
            } finally {
                if (!cancelled) {
                    setIsResolvingConversation(false);
                }
            }
        };

        createOrGetConversation();

        return () => {
            cancelled = true;
        };
    }, [currentUser?.id, currentUser?.token, targetUserId, authHeaders]);

    if (!currentUser) {
        return (
            <div className="card max-w-xl mx-auto text-center space-y-3">
                <h1 className="text-2xl font-bold text-academic-900">Messages</h1>
                <p className="text-academic-600">Please log in to use messaging.</p>
                <div>
                    <Link to="/login" className="btn btn-primary">Log In</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="-mx-3 -my-3 sm:-mx-5 sm:-my-5 lg:-mx-8 lg:-my-8 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
            {isResolvingConversation && (
                <div className="mx-3 mt-3 sm:mx-5 lg:mx-8 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-700">
                    Opening chat...
                </div>
            )}
            <ChatWidget
                currentUser={currentUser}
                authHeaders={authHeaders}
                onAuthExpired={onAuthExpired}
                pageMode
                forceOpen
                hideLauncher
                initialConversation={initialConversation}
                initialRecipientId={targetUserId}
            />
        </div>
    );
}
