import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import OldGold from "./pages/OldGold";
import Sales from "./pages/Sales";
import Profit from "./pages/Profit";
import Settings from "./pages/Settings";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/old-gold" element={<OldGold />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/profit" element={<Profit />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
