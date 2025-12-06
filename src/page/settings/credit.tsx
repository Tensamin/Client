// Package Imports
import * as Icon from "lucide-react";

// Components
import { Button } from "@/components/ui/button";

// Main
export default function Page() {
  const projects = [
    {
      name: "LiveKit",
      onlineLicenselink:
        "https://github.com/livekit/components-js/blob/main/LICENSE",
      localLicenseLink: "/licenses/LIVEKIT.txt",
      license: "Apache-2.0",
    },
    {
      name: "RNNoise",
      onlineLicenselink: "https://github.com/xiph/rnnoise/blob/main/COPYING",
      localLicenseLink: "/licenses/RNNOISE.txt",
      license: "BSD 3-Clause",
    },
    {
      name: "SpeedX",
      onlineLicenselink: "https://www.xiph.org/licenses/bsd/speex/",
      localLicenseLink: "/licenses/SPEEDX.txt",
      license: "Revised BSD license",
    },
  ];

  const contributers = [
    {
      name: "Alex Emmet",
      website: "https://methanium.net",
      work: "Project founder and lead backend developer. Created the Iota, Omikron and Omega, as well as make the two graphics on the homepage. ",
      picture: "https://github.com/Alex-Emmet.png",
    },
    {
      name: "Alois",
      website: "https://alois.methanium.net",
      work: "Project co-founder and lead frontend developer. Created the Client, Homepage and Documentation websites and the Auth Server.",
      picture: "https://github.com/aloisianer.png",
    },
    {
      name: "Gamebreaker",
      website: "https://github.com/realgamebreaker",
      work: "Implemented noise suppression for calls and help a lot with the Iota Frontend.",
      picture: "https://github.com/realgamebreaker.png",
    },
    {
      name: "Jonathan Wanke",
      website: "https://github.com/JonathanWanke",
      work: "Helped with testing the macos app, made the call sounds and helped a lot with the Iota Frontend.",
      picture: "https://github.com/JonathanWanke.png",
    },
    {
      name: "Tommy2kk",
      website: "https://github.com/Tommy2kk",
      work: "Made our logo and some icons as well as help with design desicions.",
      picture: "https://github.com/tommy2kk.png",
    },
    {
      name: "t3kkm0tt",
      website: "https://t3kkm0tt.github.io/",
      work: "Helped with testing the aur packages. Helped during developement.",
      picture: "http://github.com/t3kkm0tt.png",
    },
  ];

  return (
    <div className="flex flex-col gap-15">
      <div className="flex flex-col gap-5">
        <h2 className="text-xl font-medium">Open Source Projects</h2>
        <div className="flex flex-col 2xl:flex-row gap-10 pl-3">
          {projects.map((project, index) => (
            <div className="flex flex-col gap-2" key={index}>
              <div className="flex flex-col">
                <p className="text-lg font-semibold">{project.name}</p>
                <p className="text-sm text-muted-foreground">
                  {project.license}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    window.open(project.onlineLicenselink, "_blank")
                  }
                >
                  <Icon.ExternalLink /> Online License
                </Button>
                <Button
                  onClick={() =>
                    window.open(project.localLicenseLink, "_blank")
                  }
                >
                  <Icon.ExternalLink /> Local License
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <h2 className="text-xl font-medium">Contributers</h2>
        <div className="flex flex-col gap-10 pl-3">
          {contributers.map((contributer, index) => (
            <div className="flex flex-col gap-2" key={index}>
              <div className="flex gap-3">
                {/* eslint-disable-next-line */}
                <img
                  src={contributer.picture}
                  className="aspect-square h-12 rounded-full border"
                />
                <div className="flex flex-col">
                  <p className="text-lg font-semibold flex items-center">
                    {contributer.name}
                    <span
                      onClick={() => {
                        window.open(contributer.website, "_blank");
                      }}
                      className="text-xs font-medium pl-3 cursor-pointer"
                    >
                      {contributer.website}
                    </span>
                  </p>
                  <p className="text-sm text-ring w-2/3">{contributer.work}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
