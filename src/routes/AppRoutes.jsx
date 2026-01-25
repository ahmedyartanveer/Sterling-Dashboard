import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { useAuth } from '../auth/AuthProvider';
import { PrivateRoute } from '../auth/PrivateRoute';

// Layouts
import { SuperAdminLayout } from '../pages/superadmin/components/SuperAdminLayout';
import { ManagerLayout } from '../pages/manager/components/ManagerLayout';
import { TechLayout } from '../pages/tech/components/TechLayout';

// Pages - Auth
import { Login } from '../pages/login/Login';
import { ErrorPage } from '../pages/error/ErrorPage';
import { LoginRoute } from '../auth/LoginRoute';

// Pages - Super Admin
import { SuperAdminDashboard } from '../pages/superadmin/SuperAdminDashboard';
import { SuperAdminProfile } from '../pages/superadmin/Profile';
import { UserManagement } from '../pages/superadmin/UserManagement';
import { TechUser } from '../pages/superadmin/TechUser';
import { Overview } from '../pages/superadmin/Overview';
import { Dispatch } from '../pages/superadmin/Dispatch';
import { LogisticsMap } from '../pages/superadmin/LogisticsMap';
import { Installations } from '../pages/superadmin/Installations';
import { Repairs } from '../pages/superadmin/Repairs';
import { Scheduling } from '../pages/superadmin/Scheduling';
import { Performance } from '../pages/superadmin/Performance';
import { Quotes } from '../pages/superadmin/Quotes';
import { Leads } from '../pages/superadmin/Leads';
import { VehiclesTools } from '../pages/superadmin/VehiclesTools';
import { Inventory } from '../pages/superadmin/Inventory';
import { RiskManagement } from '../pages/superadmin/RiskManagement';
import { Scorecards } from '../pages/superadmin/Scorecards';
import { Forms } from '../pages/superadmin/Forms';
import { ReviewForms } from '../pages/superadmin/ReviewForms';
import { Approvals } from '../pages/superadmin/Approvals';
import { Training } from '../pages/superadmin/Training';
import { Tasks } from '../pages/superadmin/Tasks';
import { Library } from '../pages/superadmin/Library';

// Pages - Manager
import { ManagerDashboard } from '../pages/manager/ManagerDashboard';
import { ManagerProfile } from '../pages/manager/Profile';
import { TechUserManagement } from '../pages/manager/TechUserManagement';
import Locates from '../pages/manager/locates/Locates';
import RMEReports from '../pages/manager/HMIS/RMEReports';
import RSSReports from '../pages/manager/HMIS/RSSReports';
import TOSReports from '../pages/manager/HMIS/TOSReports';

// Pages - Tech
import { TechDashboard } from '../pages/tech/TechDashboard';
import { TechProfile } from '../pages/tech/Profile';
import { MyTasks } from '../pages/tech/MyTasks';
import { MySchedule } from '../pages/tech/MySchedule';
import { TechForms } from '../pages/tech/Forms';
import { SubmitForm } from '../pages/tech/SubmitForm';
import { HealthDepartmentReports } from '../pages/tech/HealthDepartmentReports';
import { SubmitHealthReport } from '../pages/tech/SubmitHealthReport';
import { TechRiskManagement } from '../pages/tech/RiskManagement';
import { SubmitRiskAssessment } from '../pages/tech/SubmitRiskAssessment';
import { Courses } from '../pages/tech/Courses';
import Notifications from '../components/Notification/Notifications';


export const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* ===================== Public Routes ===================== */}
        <Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />

        {/* ===================== Error Pages ===================== */}
        <Route path="/error" element={<ErrorPage />} />
        <Route path="/unauthorized" element={<ErrorPage type="unauthorized" />} />
        <Route path="/not-found" element={<ErrorPage type="not-found" />} />
        <Route path="/server-error" element={<ErrorPage type="server-error" />} />

        {/* ===================== Dashboard Redirect ===================== */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              {user?.role === 'superadmin' && <Navigate to="/super-admin-dashboard" replace />}
              {user?.role === 'manager' && <Navigate to="/manager-dashboard" replace />}
              {user?.role === 'tech' && <Navigate to="/tech-dashboard" replace />}
            </PrivateRoute>
          }
        />

        {/* ===================== Super Admin Routes ===================== */}
        <Route
          path="/super-admin-dashboard"
          element={
            <PrivateRoute requiredRoles={['superadmin']}>
              <SuperAdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="profile" element={<SuperAdminProfile />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="all-technicians" element={<TechUser />} />

          {/* Pages */}
          <Route path="overview" element={<Overview />} />
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="logistics-map" element={<LogisticsMap />} />
          <Route path="installations" element={<Installations />} />
          <Route path="repairs" element={<Repairs />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="performance" element={<Performance />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="leads" element={<Leads />} />
          <Route path="vehicles-tools" element={<VehiclesTools />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="risk-management" element={<RiskManagement />} />
          <Route path="scorecards" element={<Scorecards />} />
          <Route path="forms" element={<Forms />} />
          <Route path="review-forms" element={<ReviewForms />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="training" element={<Training />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="library" element={<Library />} />

          {/* Health Dept Reports */}
          <Route path="health-department-report-tracking/rme" element={<RMEReports />} />
          <Route path="health-department-report-tracking/rss" element={<RSSReports />} />
          <Route path="health-department-report-tracking/tos" element={<TOSReports />} />

          {/* Locates */}
          <Route path="locates" element={<Locates />} />

          {/* Notifications */}
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* ===================== Manager Routes ===================== */}
        <Route
          path="/manager-dashboard"
          element={
            <PrivateRoute requiredRoles={['manager']}>
              <ManagerLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<ManagerDashboard />} />
          <Route path="profile" element={<ManagerProfile />} />
          <Route path="all-technicians" element={<TechUserManagement />} />
          <Route path="locates" element={<Locates />} />

          {/* Pages (Shared with Super Admin) */}
          <Route path="overview" element={<Overview />} />
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="logistics-map" element={<LogisticsMap />} />
          <Route path="installations" element={<Installations />} />
          <Route path="repairs" element={<Repairs />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="performance" element={<Performance />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="leads" element={<Leads />} />
          <Route path="vehicles-tools" element={<VehiclesTools />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="risk-management" element={<RiskManagement />} />
          <Route path="scorecards" element={<Scorecards />} />
          <Route path="forms" element={<Forms />} />
          <Route path="review-forms" element={<ReviewForms />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="training" element={<Training />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="library" element={<Library />} />

          {/* Health Dept Reports */}
          <Route path="health-department-report-tracking/rme" element={<RMEReports />} />
          <Route path="health-department-report-tracking/rss" element={<RSSReports />} />
          <Route path="health-department-report-tracking/tos" element={<TOSReports />} />

          {/* Notifications */}
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* ===================== Tech Routes ===================== */}
        <Route
          path="/tech-dashboard"
          element={
            <PrivateRoute requiredRoles={['tech']}>
              <TechLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<TechDashboard />} />
          <Route path="profile" element={<TechProfile />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="my-schedule" element={<MySchedule />} />
          <Route path="forms" element={<TechForms />} />
          <Route path="forms/submit" element={<SubmitForm />} />
          <Route path="health-department-reports" element={<HealthDepartmentReports />} />
          <Route path="health-department-reports/submit" element={<SubmitHealthReport />} />
          <Route path="risk-management" element={<TechRiskManagement />} />
          <Route path="risk-management/submit" element={<SubmitRiskAssessment />} />
          <Route path="courses" element={<Courses />} />
        </Route>

        {/* ===================== Fallback Routes ===================== */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<ErrorPage type="not-found" />} />
      </Routes>
    </Router>
  );
};
