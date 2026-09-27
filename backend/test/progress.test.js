import {test} from 'node:test';
import assert from 'node:assert/strict';
import {processingProgress} from '../src/app.js';
test('progress counts only persisted milestones and never implies elapsed-time estimate',()=>{
 assert.deepEqual(processingProgress('transcribing'),{percent:0,completed:0,total:6});
 assert.deepEqual(processingProgress('chunking',0,true,false),{percent:16,completed:1,total:6});
 assert.deepEqual(processingProgress('generating',0,true,true),{percent:33,completed:2,total:6});
 assert.deepEqual(processingProgress('generating',2,true,true),{percent:66,completed:4,total:6});
 assert.deepEqual(processingProgress('ready',4,true,true),{percent:100,completed:6,total:6});
 assert.deepEqual(processingProgress('failed',3,true,true),{percent:83,completed:5,total:6});
});
