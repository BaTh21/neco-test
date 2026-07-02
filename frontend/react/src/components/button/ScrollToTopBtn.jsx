import { useEffect, useState } from "react";

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: "fixed",
        bottom: "10",
        right: "10",
        padding: "10px 15px",
        fontSize: "16px",
        borderRadius: "50%",
        border: "none",
        backgroundColor: "#333",
        color: "#fff",
        cursor: "pointer",
        display: visible ? "block" : "none",
      }}
    >
      ↑
    </button>
  );
};

export default ScrollToTopButton;
