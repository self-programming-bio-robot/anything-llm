import {useState} from "react";

export default function IconButton(
  {
    Icon,
    onClick,
    hidden = false,
    pressed = false,
    className = ""
  }
) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`rounded-md flex items-center justify-center text-white ` + className}
    >
      <Icon weight={pressed || isHovered ? "fill" : "regular"}
            hidden={hidden}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`h-[20px] w-[20px] transition-all duration-300`
              + (!pressed && isHovered ? ` opacity-70` : ``) }
      />
    </button>
  );
}
