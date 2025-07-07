// src/Contexts/APIs/APITESTPAGE.js - 이상영
import {useEffect, useState} from 'react';
import {getResourceAPI} from './ResourceAPI';
import { Toaster, toast } from 'react-hot-toast';

export default function APITestPage() {
    const resourceAPI = getResourceAPI(0);
    const [testNoteIDValue, setTestNoteIDValue] = useState(0);
    const [testGroupIDValue, setTestGroupIDValue] = useState(0);
    useEffect(() => {
        const info = resourceAPI.token_info();
        info.then((data) => {
            console.log('Token Info:', data);
        }).catch((error) => {
            console.error('Error fetching token info:', error);
        });
    }, []);

    // 이 함수는 API 테스트 페이지를 반환합니다.
    const deleteNote = async (noteId, groupId) => {
        try {
            const response = await resourceAPI.deleteNote(noteId, groupId);
            console.log(`response : ${response}`);
            if (response.success) {
                console.log(`Note ${noteId} deleted successfully.`);
            }
            else {
                console.error(`Failed to delete note ${noteId}: ${response.message}`);
            }
        } catch (error) {
            console.error(`Failed to delete note ${noteId}:`, error);
        }
    };
    const getContent = async (noteId, groupId) => {
        try {
            const response = await resourceAPI.getContent(noteId, groupId);
            console.log(`response : ${response}`);
            if (response.success) {
                console.log(`Content for note ${noteId}:`, response.content);
            } else {
                console.error(`Failed to get content for note ${noteId}: ${response.message}`);
            }       
        } catch (error) {
            console.error(`Failed to get content for note ${noteId}:`, error);
        }
    };
    
    //DOM
    return (
        <div className="apitestpage">
            {/* <Toaster> */}
                <h1>API Test Page</h1>
                <input
                    type="number"
                    value={testNoteIDValue}
                    onChange={(e) => setTestNoteIDValue(e.target.value)}
                    placeholder="Enter Note ID"
                    />
                <input
                    type="number"
                    value={testGroupIDValue}
                    onChange={(e) => setTestGroupIDValue(e.target.value)}
                    placeholder="Enter Group ID"
                    />
                <button onClick={() => {deleteNote(testNoteIDValue, testGroupIDValue); console.log(`Delete Note(${testNoteIDValue}, ${testGroupIDValue})`)}}>
                    Delete Note {testNoteIDValue}</button>
                
            {/* </Toaster> */}
        </div>
    );
}