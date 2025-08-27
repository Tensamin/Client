// Package Imports
import { useEffect } from "react";

// Components
import { useCommunityContext } from "@/components/context/communtiy";

// Main
export function Main({ data }) {
    let { setConnectToCommunity, setDomain, setPort } = useCommunityContext();

    useEffect(() => {
        let domain = JSON.parse(data);
        setDomain(domain[0]);
        setPort(domain[1]);
        setConnectToCommunity(true);
    }, [])

    return (
        <div>Community {data}</div>
    )
}