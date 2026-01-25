import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { PrivateRoute } from '../auth/PrivateRoute';

import { SuperAdminLayout } from '../pages/superadmin/components/SuperAdminLayout';
import { ManagerLayout } from '../pages/manager/components/ManagerLayout';
import { TechLayout } from '../pages/tech/components/TechLayout';

import { Login } from '../pages/login/Login';
import { ErrorPage } from '../pages/error/ErrorPage';
import { LoginRoute } from '../auth/LoginRoute';

import { SuperAdminDashboard } from '../pages/superadmin/pages/SuperAdminDashboard';
import { SuperAdminProfile } from '../pages/superadmin/pages/Profile';
import { UserManagement } from '../pages/superadmin/pages/UserManagement';
import { TechUser } from '../pages/superadmin/pages/TechUser';
import { Overview } from '../pages/superadmin/pages/Overview';
import { Dispatch } from '../pages/superadmin/pages/Dispatch';
import { LogisticsMap } from '../pages/superadmin/pages/LogisticsMap';
import { Installations } from '../pages/superadmin/pages/Installations';
import { Repairs } from '../pages/superadmin/pages/Repairs';
import { Scheduling } from '../pages/superadmin/pages/Scheduling';
import { Performance } from '../pages/superadmin/pages/Performance';
import { Quotes } from '../pages/superadmin/pages/Quotes';
import { Leads } from '../pages/superadmin/pages/Leads';
import { VehiclesTools } from '../pages/superadmin/pages/VehiclesTools';
import { Inventory } from '../pages/superadmin/pages/Inventory';
import { RiskManagement } from '../pages/superadmin/pages/RiskManagement';
import { Scorecards } from '../pages/superadmin/pages/Scorecards';
import { Forms } from '../pages/superadmin/pages/Forms';
import { ReviewForms } from '../pages/superadmin/pages/ReviewForms';
import { Approvals } from '../pages/superadmin/pages/Approvals';
import { Training } from '../pages/superadmin/pages/Training';
import { Tasks } from '../pages/superadmin/pages/Tasks';
import { Library } from '../pages/superadmin/pages/Library';

import { ManagerDashboard } from '../pages/manager/pages/ManagerDashboard';
import { ManagerProfile } from '../pages/manager/pages/Profile';
import { TechUserManagement } from '../pages/manager/pages/TechUserManagement';
import Locates from '../pages/manager/pages/Locates';
import RMEReports from '../pages/manager/pages/RMEReports';
import RSSReports from '../pages/manager/pages/RSSReports';
import TOSReports from '../pages/manager/pages/TOSReports';

import Notifications from '../components/Notification/Notifications';

import { MyScorecard } from '../pages/tech/pages/MyScorecard';
import { TechProfile } from '../pages/tech/pages/Profile';
import { TechDashboard } from '../pages/tech/pages/TechDashboard';
import { ReportsRme } from '../pages/tech/pages/ReportsRme';
import { VehiclesTrucks } from '../pages/tech/pages/VehiclesTrucks';
import { VehiclesList } from '../pages/tech/pages/VehiclesList';
import { VehiclesPhotos } from '../pages/tech/pages/VehiclesPhotos';
import { VehiclesInventory } from '../pages/tech/pages/VehiclesInventory';
import { TeamDailyChecklist } from '../pages/tech/pages/TeamDailyChecklist';
import { ResourcesLibrary } from '../pages/tech/pages/ResourcesLibrary';




export const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />

        <Route path="/error" element={<ErrorPage />} />
        <Route path="/unauthorized" element={<ErrorPage type="unauthorized" />} />
        <Route path="/not-found" element={<ErrorPage type="not-found" />} />
        <Route path="/server-error" element={<ErrorPage type="server-error" />} />

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

        <Route
          path="/super-admin-dashboard"
          element={<PrivateRoute requiredRoles={['superadmin']}><SuperAdminLayout /></PrivateRoute>}
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="profile" element={<SuperAdminProfile />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="all-technicians" element={<TechUser />} />
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

          <Route path="health-department-report-tracking/rme" element={<RMEReports />} />
          <Route path="health-department-report-tracking/rss" element={<RSSReports />} />
          <Route path="health-department-report-tracking/tos" element={<TOSReports />} />

          <Route path="locates" element={<Locates />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route
          path="/manager-dashboard"
          element={<PrivateRoute requiredRoles={['manager']}><ManagerLayout /></PrivateRoute>}
        >
          <Route index element={<ManagerDashboard />} />
          <Route path="profile" element={<ManagerProfile />} />
          <Route path="all-technicians" element={<TechUserManagement />} />
          <Route path="locates" element={<Locates />} />
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

          <Route path="health-department-report-tracking/rme" element={<RMEReports />} />
          <Route path="health-department-report-tracking/rss" element={<RSSReports />} />
          <Route path="health-department-report-tracking/tos" element={<TOSReports />} />

          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route
          path="/tech-dashboard"
          element={<PrivateRoute requiredRoles={['tech']}><TechLayout /></PrivateRoute>}
        >
          <Route index element={<TechDashboard />} />
          <Route path="profile" element={<TechProfile />} />
          <Route path="my-scorecard" element={<MyScorecard />} />
          <Route path="reports/rme" element={<ReportsRme />} />

          <Route path="vehicles/trucks" element={<VehiclesTrucks />} />
          <Route path="vehicles/list" element={<VehiclesList />} />
          <Route path="vehicles/photos" element={<VehiclesPhotos />} />
          <Route path="vehicles/inventory" element={<VehiclesInventory />} />

          <Route path="team/daily-checklist" element={<TeamDailyChecklist />} />

          <Route path="resources/library" element={<ResourcesLibrary />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<ErrorPage type="not-found" />} />
      </Routes>
    </Router>
  );
};
