import { Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin.jsx";
import Home from "./pages/Home.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/review/:id" element={<ReviewPage />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/edit/:id" element={<Admin />} />
    </Routes>
  );
}
