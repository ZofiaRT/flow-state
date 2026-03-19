import * as assert from 'assert';
import * as vscode from 'vscode';
import { ActivityTracker } from '../features/ActivityTracker';

suite('ActivityTracker Test Suite', () => {
    let tracker: ActivityTracker;

    setup(() => {
        tracker = new ActivityTracker();
    });

    test('Initial state should be zeroed out', () => {
        assert.strictEqual(tracker.totalTabSwitches, 0);
        assert.strictEqual(tracker.charactersAdded, 0);
        assert.strictEqual(tracker.charactersDeleted, 0);
        assert.strictEqual(tracker.isScrolling, false);
        assert.strictEqual(tracker.recentPastedCharacters, 0);
    });

    test('onDocumentChanged tracks character additions correctly', () => {
        const mockEvent = {
            contentChanges: [
                { text: 'hello', rangeLength: 0 }
            ]
        } as unknown as vscode.TextDocumentChangeEvent;

        tracker.onDocumentChanged(mockEvent);

        assert.strictEqual(tracker.charactersAdded, 5);
        assert.strictEqual(tracker.charactersDeleted, 0);
    });

    test('onDocumentChanged tracks character deletions correctly', () => {
        const mockEvent = {
            contentChanges: [
                { text: '', rangeLength: 10 }
            ]
        } as unknown as vscode.TextDocumentChangeEvent;

        tracker.onDocumentChanged(mockEvent);

        assert.strictEqual(tracker.charactersAdded, 0);
        assert.strictEqual(tracker.charactersDeleted, 10);
    });

    test('onDocumentChanged detects large text pastes', () => {
        const largeText = 'a'.repeat(60);
        const mockEvent = {
            contentChanges: [
                { text: largeText, rangeLength: 0 }
            ]
        } as unknown as vscode.TextDocumentChangeEvent;

        tracker.onDocumentChanged(mockEvent);

        assert.strictEqual(tracker.charactersAdded, 60);
        assert.strictEqual(tracker.recentPastedCharacters, 60);
    });

    test('getAddDeleteRatio calculates correctly', () => {
        tracker.onDocumentChanged({
            contentChanges: [{ text: '1234567890', rangeLength: 0 }]
        } as unknown as vscode.TextDocumentChangeEvent);
        
        tracker.onDocumentChanged({
            contentChanges: [{ text: '', rangeLength: 5 }]
        } as unknown as vscode.TextDocumentChangeEvent);

        assert.strictEqual(tracker.getAddDeleteRatio(), 2);
    });

    test('getAddDeleteRatio handles division by zero', () => {
        tracker.onDocumentChanged({
            contentChanges: [{ text: 'hello', rangeLength: 0 }]
        } as unknown as vscode.TextDocumentChangeEvent);

        assert.strictEqual(tracker.getAddDeleteRatio(), Infinity);
        
        const emptyTracker = new ActivityTracker();
        assert.strictEqual(emptyTracker.getAddDeleteRatio(), 0);
    });

    test('onScrolled updates isScrolling flag', () => {
        const mockScrollEvent = {} as vscode.TextEditorVisibleRangesChangeEvent;
        
        tracker.onScrolled(mockScrollEvent);
        assert.strictEqual(tracker.isScrolling, true);
        
        const mockTypeEvent = {
            contentChanges: [{ text: 'a', rangeLength: 0 }]
        } as unknown as vscode.TextDocumentChangeEvent;
        
        tracker.onDocumentChanged(mockTypeEvent);
        assert.strictEqual(tracker.isScrolling, false);
    });
});