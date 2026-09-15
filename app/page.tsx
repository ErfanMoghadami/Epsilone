import React from "react";
import Image from "next/image";
import sss from "@/assets/favicon.png";
// import Link from "next/link";

const page = () => {
  return (
    <>
      <div className="flex self-center">
        <Image src={sss} alt="" width={500} height={500} />
      </div>
    </>
  );
};

export default page;
