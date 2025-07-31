import React from 'react'
import logo from "../assets/logo2.png"
import packageLogo from "../assets/package.png"

const Header = () => {
  return (
    <header className="w-full overflow-y-auto  bg-[#e2c9f2] shadow-sm fixed top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      {/* Left Logo */}
      <div className="flex-shrink-0">

          <div className="w-10 h-10 relative">
            <img
              src={logo}
              alt="Factorykaam Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
      </div>

      {/* Middle Text */}
      <div className="flex-grow flex justify-center">

          <h1 className="text-2xl font-bold text-black tracking-wide">
            factorykaam
          </h1>
      
      </div>

      {/* Right Logo */}
      <div className="flex">
        <div className="w-30 h-10 relative flex justify-center items-center  z-10 rounded-full">
          <img
            src={packageLogo}
            alt="Right Logo"
            width={60}
            height={60}
            className="object-contain"

          />
        </div>
      </div>
    </div>
  </header>
  )
}

export default Header
