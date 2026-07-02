import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { getUnreadMessage } from "../services/api";

const UnreadMessagesContext = createContext(null);

export function UnreadMessagesProvider({ children }) {
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchUnreadMessages = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getUnreadMessage();
            setUnreadMessages(res ?? 0);
        } catch (error) {
            console.error(error);
            setUnreadMessages(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnreadMessages();
    }, [fetchUnreadMessages]);

    return (
        <UnreadMessagesContext.Provider
            value={{
                unreadMessages,
                setUnreadMessages,
                fetchUnreadMessages,
                loading,
            }}
        >
            {children}
        </UnreadMessagesContext.Provider>
    );
}

export function useUnreadMessages() {
    const context = useContext(UnreadMessagesContext);

    if (!context) {
        throw new Error(
            "useUnreadMessages must be used within UnreadMessagesProvider"
        );
    }

    return context;
}