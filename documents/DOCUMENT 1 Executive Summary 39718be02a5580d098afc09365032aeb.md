# DOCUMENT 1: Executive Summary

**Project Name:** TPO Management System (Training & Placement Office Portal)
**Document Version:** 1.0
**Date:** Current

### **1.1 Overview**

The TPO Management System is a production-grade, multi-tenant web application designed to digitize, automate, and optimize the campus placement process for educational institutions. Unlike traditional single-college tools, this platform supports multiple independent colleges (organizations) within a single deployment, featuring strict data isolation, role-based access control, and an AI-driven interview preparation module.

### **1.2 The Problem**

Currently, placement coordination relies on fragmented manual processes—spreadsheets, emails, and physical notice boards. This leads to opaque eligibility tracking, poor student-company communication, lack of mock interview preparation, and severe difficulty in managing placement data across multiple departments or institutions.

### **1.3 The Solution**

A centralized, minimalistic (Apple-style UI) portal that provides:

- **Multi-Tenant Architecture:** Colleges operate as isolated tenants. Companies operate globally but recruit locally.
- **Automated Eligibility Engine:** Rule-based (Branch, CGPA, Backlogs) real-time filtering preventing ineligible applications.
- **AI Mock Interviews:** Asynchronous, queue-based AI testing (via Nvidia NIM) to prepare students, with optional mandatory gating controlled by companies.
- **Dual-Gate Job Approval:** Ensures quality control via Super Admin (company validation) and College Admin (job validation).
- **Offer State Machine:** Automated withdrawal of competing offers upon acceptance, preventing placement conflicts.

### **1.4 Target Audience & Stakeholders**

- **Super Admin:** Platform owners managing colleges and global companies.
- **College Admin:** Institution managers handling departments, mentors, and local job approvals.
- **Mentors:** Department-level faculty verifying student profiles and document validity.
- **Students:** End-users building profiles, applying for jobs, and preparing for interviews.
- **Companies:** Global recruiters posting jobs, shortlisting candidates, and managing interview rounds.

### **1.5 Technology Stack**

- **Frontend:** Next.js (App Router), Tailwind CSS (Apple Minimalism Design System)
- **Backend/Database:** Supabase (PostgreSQL, Row Level Security, Auth)
- **AI Engine:** Nvidia NIM (Rate limited to 40 RPM, handled via async queue)
- **Storage:** V1 uses external URL links (Drive/OneDrive); V2 will introduce native bucket storage.

### **1.6 Development Constraints**

- **Team:** 5 members (1 lead, 3 junior/mark-focused, 1 slow learner). Architecture must be heavily modular to allow isolated ownership of features without merge conflicts.
- **Timeline:** ~3 months.
- **Testing:** Light E2E focused strictly on critical paths (Auth, Applications, Approvals).