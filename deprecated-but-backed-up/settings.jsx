import { useExtensionsContext } from "@/components/context/extensions";

export function Extensions() {
  let { extensions, setExtensions } = useExtensionsContext();
  let [newExtension, setNewExtension] = useState("");
  let [newExtensions, setNewExtensions] = useState("");
  let addExtensionButtonRef = useRef(null);
  let importExtensionsButtonRef = useRef(null);

  useEffect(() => {
    if (!newExtension || newExtension === "") return;

    try {
      let jsonExtension = JSON.parse(newExtension);
      if (
        jsonExtension.name &&
        jsonExtension.description &&
        jsonExtension.version &&
        jsonExtension.src
      ) {
        let extensionName = jsonExtension.name;

        fetch(jsonExtension.src)
          .then((response) => response.text())
          .then((data) => {
            setExtensions((prev) => ({
              ...prev,
              [extensionName]: {
                name: jsonExtension.name,
                description: jsonExtension.description,
                version: jsonExtension.version,
                src: btoa(data),
                enabled: true,
              },
            }));
            toast.success("Added Extension");
          });
      } else {
        toast("Invalid Extension");
      }
    } catch (err) {
      toast("Invalid Extension");
    }
  }, [newExtension, setExtensions]);

  useEffect(() => {
    if (!newExtensions || newExtensions === "") return;
    try {
      let jsonExtensions = JSON.parse(newExtensions);
      if (Object.keys(jsonExtensions).length >= 1) {
        setExtensions(jsonExtensions);
        toast.success("Added Extensions");
      } else {
        toast("Invalid Extensions");
      }
    } catch (err) {
      toast("Invalid Extensions");
    }
  }, [newExtensions, setExtensions]);

  let handleToggle = (key, nextEnabled) => {
    setExtensions((prev) => {
      if (!prev || !prev[key]) return prev;
      if (prev[key].enabled === nextEnabled) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          enabled: nextEnabled,
        },
      };
    });
  };

  function ExtensionCard({ extensionKey, extension, onToggle }) {
    let [enabled, setEnabled] = useState(Boolean(extension.enabled));

    useEffect(() => {
      setEnabled(Boolean(extension.enabled));
    }, [extension.enabled]);

    let handleChange = (next) => {
      setEnabled(next);
      if (onToggle) onToggle(extensionKey, next);
    };

    return (
      <Card
        key={extensionKey}
        className="bg-input/30 border-input hover:bg-input/50"
      >
        <CardHeader>
          <CardTitle>{extension.name}</CardTitle>
          <CardAction className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={handleChange} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-9 h-9">
                  <Icon.Trash />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This is just a confirmation so you don't accidentally delete
                    something.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setExtensions((prev) => {
                        let newExts = { ...prev };
                        delete newExts[extensionKey];
                        return newExts;
                      });
                    }}
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardAction>
          <p className="text-sm text-muted-foreground">
            {extension.description}
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <p className="text-destructive text-xs md:text-md">
          Extensions are not reviewed and can steal your JWK / private key!
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <input
          ref={addExtensionButtonRef}
          onChange={async (e) => {
            let files = Array.from(e.target.files || []);
            if (files[0]) {
              setNewExtension(await readFileAsText(files[0]));
            }
          }}
          className="hidden"
          id="new-extension-file"
          type="file"
        />
        <input
          ref={importExtensionsButtonRef}
          onChange={async (e) => {
            let files = Array.from(e.target.files || []);
            if (files[0]) {
              setNewExtensions(await readFileAsText(files[0]));
            }
          }}
          className="hidden"
          id="new-extensions-file"
          type="file"
        />
        <Button
          onClick={() => {
            addExtensionButtonRef.current.click();
          }}
        >
          Add Extension
        </Button>
        <div className="w-full hidden md:block" />
        <Button
          variant="outline"
          onClick={() => {
            downloadString("extensions.json", JSON.stringify(extensions));
          }}
        >
          Export Extensions
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            importExtensionsButtonRef.current.click();
          }}
        >
          Import Extensions
        </Button>
      </div>

      {extensions &&
      extensions !== "" &&
      Object.keys(extensions).length >= 1 ? (
        <div>
          {Object.keys(extensions).map((key) => (
            <ExtensionCard
              key={key}
              extensionKey={key}
              extension={extensions[key]}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <img
            className="select-none [user-drag:none] [-webkit-user-drag:none]"
            src="/megamind.png"
            width={200}
            height={200}
            alt="Meme"
            loading="eager"
          />
          <p className="text-2xl">No Extensions?</p>
        </div>
      )}
    </div>
  );
}