import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="brand">Bang Options</Link>
        {user && <Link to="/">Trade</Link>}
        {user && <Link to="/wallet">Wallet</Link>}
        {user?.role === "ADMIN" && <Link to="/admin">Admin</Link>}
      </div>
      <div className="navbar-right">
        {user ? (
          <>
            <span className="balance">${(Number(user.balanceCents) / 100).toFixed(2)}</span>
            <button onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
