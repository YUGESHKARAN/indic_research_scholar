# Indic Scholar Assistant

## Overview

Indic Assistant for personalized learning guide, It is a AI applications which allow users to upload their knowledege base such as docs, pdfs and other documents. To perfrom personalized academic tasks like q&a, exams preparation with MCQs, to prepare presentation or seminar, all supported with indic language support. which should be the ultimate prepartaion bundle in one place.

## Goals

1. Authenticate users to manage their data as separate entities.
2. Should allow users to upload docx, pdfs or other academic documents.   
3. Studio interface with seperate section to perform:
    - Q&A task with markdown supported response along with text + voice input/output support, with copy to click board
    - Mock test, should conduct industry standard MCQs, short answer type (25- max 50) test based on the selected one or more 
      document(s) knowledge, with score, validation and proper voice supported feedback feature upon submitting the test. level should easy, medium and hard level which should be selected by users.
    - Prepare for presentation/formatted document, users can simply select the documents or input their raw formated doc and 
      describe the task context, then should get clear content from the user with follow up queries and provide the proper industry standard presentation doc by transorming the raw knowledge base to structured format. along with edit feature up-on save it should be exported as a .ppt or other presenation formated doc.


## Core User Flow

1. User signin
2. Should redirect to login/signup page on entering into workspace without authentication.
3. Upload documents (login required)
4. Enters the studio workspace (login required): 
   - Do Q&A task
   - Take up mock tests
   - Do  presentation / formatting document.     

## Features

### Perfroming Q&A with knowledge base

- User first select the one or more uploaded document, and should enable/disable, then provide the query prompt and recieve the  
  markdown supported response with copy feature.
- should have the config setting to enable or diable the voice mode.
- can select the specific voice from the listed voices.
- can select the specific indic language from the listed language.   

### Performing Mock tests

- selected one or more document(s) knowledge, from the knowledge base, conduct industry standard MCQs, short answer type (25- ]
  max 50).
- should provide validated scores and voice supported feedback upon submitting the test. 
- Contains different levels -  easy, medium and hard. which should be selected by users.

### Performing Presentation/formatting document

- for presentation taranform the raw context into industry standard presentation slides, with edit save and export feature.
- for format document, should transform uploaded or selected document into specific format, the target format can be given as 
  prompt as user or they can upload a new demo reference document/template. (e.g: I have done reserach on my new publication but having it as a raw unformatted document need to convert it into IEEE format without any mismatch)   
  note: before proceed either task, get a clear context asking follow up queries from the user.  


## Scope

### In Scope

- Authentication and route protection
- knowledge base upload, manage and delete - document docuements 
- workspace:
   - AI powered Q&A task with all the specs.
   - AI powered Presentation/formatting doc with all the specs.

### Out of Scope

- workspace:
   - AI powered Mock test with all the specs.

## Success Criteria

1. User Authentication
2. Knowledge base manage section with upload, delete docuemnt with OCR + vector store 
3. Workspace with working sections:
   - AI powered Q&A
   - AI powered Presentation/formatting doc
3. Managining users data separately - mainating the knowldge base without interferece with others data.
