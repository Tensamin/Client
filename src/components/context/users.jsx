"use client";

// Package Imports
import React, {
	createContext,
	useContext,
	useState,
} from "react";

// Lib Imports
import { log, getDisplayFromUsername } from "@/lib/utils";
import { endpoint } from "@/lib/endpoints";
import ls from "@/lib/localStorageManager";

// Main
let UsersContext = createContext();

// Use Context Function
export function useUsersContext() {
	let context = useContext(UsersContext);
	if (context === undefined) {
		throw new Error(
			"useUsersContext must be used within a UsersProvider",
		);
	}
	return context;
}

// Provider
export function UsersProvider({ children }) {
	let [fetchedUsers, setFetchedUsers] = useState({});
	let [userStates, setUserStates] = useState({});
	let [chatsArray, setChatsArray] = useState([]);
	let [forceLoad, setForceLoad] = useState(false);
	let [ownState, setOwnState] = useState("ONLINE");
	let [refetchUser, setRefetchUser] = useState(false);

	async function clearFromCache(uuid) {
		await get(uuid, true);
		setRefetchUser((prev) => !prev);
	}

	function getUserState(uuid) {
		if (userStates[uuid]) {
			return userStates[uuid];
		} else {
			return "none";
		}
	}

	function setUserState(uuid, state) {
		setUserStates((prevUsers) => ({
			...prevUsers,
			[uuid]: state,
		}));
	}

	function makeChatTop(uuid) {
		let newArray = [...chatsArray];
		let indexToMove = newArray.findIndex((item) => item.user_id === uuid);
		if (indexToMove > 0) {
			let [itemToMove] = newArray.splice(indexToMove, 1);
			newArray.unshift(itemToMove);
			setChatsArray(newArray);
		}
	}

	async function get(uuid, refresh = false) {
		if (typeof uuid !== "undefined") {
			if (fetchedUsers[uuid] && !refresh) {
				log("User already fetched: " + uuid, "debug");
				return fetchedUsers[uuid];
			} else {
				let fetchedUser = await fetch(`${endpoint.user}${uuid}`)
					.then((response) => response.json())
					.then((data) => {
						if (data.type !== "error") {
							return data.data;
						} else {
							return null;
						}
					})
					.catch((error) => {
						return null;
					});

				if (!fetchedUser || fetchedUser === null) {
					fetchedUser = {
						uuid: uuid,
						created_at: 0,
						username: "Failed to load",
						display: "Failed to load",
						avatar: "...",
						about: "Failed to load",
						status: "",
						public_key: "MIICLjANBgkqhkiG9w0BAQEFAAOCAhsAMIICFgKCAg0NmcU0Xqog/GN/Fvg8EXPirko4RIHjDxq4gbQ8eqEj0ui4GpL5DVt50u/6Lx81/thYrCfg/jq75n6ARYxMgadC4BRKrpaWiKFVilprZ/8fjCpD1k3RPaxMjaKtjncxNzoCUTwQkq4Yoy++Kh8FWAim7454lNd1r1YtyeiPn/WsDX+h/PrIVqR0PStx4QHxO3SkPRwNQR+1paJBKPK4SiKGJyHNDXlcxuz6A0FD1tZ8IBidSSqloayg+kCMZpgSRceOMZONvWJKlsRkaJZcwPJ/up5aDGT55DSoHtwZpI/L3XHKNukc3+X9moj1dSTbH1yAJNQqJdyEnYD8P37+uxBS44A42aFhqrbsimcadIev+Fqp3CWiZz9oAxx3bQBeTKCj/IzMGQFdN4Lq5oGSWJE/Banb6VdaPdfdIAAP1CSXLL1KpENlJvxkD+2UKptHjoz5cVo2lv6sHZacztuLa4nzAq3AXs53D+givWHzeyXIOYEnt6tq6eLn5lfWLBCbwIaQCcEuKmoJm8qhzO9nrB3ISg42RRkLd+ccSt7ZTo+4UmkFnUsfg3F0l2/NrasWH57Sw/+EhBEDWscKKt15HdJFkeWKYPpkjSySofwq7U00bgIFvWohgGca3o04CDmSq1u2RLDayIUKAt6hNXBxcTVQeK+l/uQKFhtvz2t2Ow2d+jXDAXg4g2gJg5YBrU0CAwEAAQ==",
						sub_level: 0,
						sub_end: 0,
					};
				}

				let userToStore = {
					uuid: uuid,
					created_at: fetchedUser.created_at,
					username: fetchedUser.username,
					display: getDisplayFromUsername(
						fetchedUser.username,
						fetchedUser.display,
					),
					avatar: fetchedUser.avatar,
					about: atob(fetchedUser.about),
					status: fetchedUser.status,
					public_key: fetchedUser.public_key,
					sub_level: fetchedUser.sub_level,
					sub_end: fetchedUser.sub_end,
				};

				setFetchedUsers((prevUsers) => ({
					...prevUsers,
					[uuid]: userToStore,
				}));

				return userToStore;
			}
		} else {
			return {};
		}
	}

	return (
		<UsersContext.Provider
			value={{
				get,
				fetchedUsers,
				userStates,
				getUserState,
				setUserState,
				setUserStates,
				chatsArray,
				setChatsArray,
				makeChatTop,
				forceLoad,
				setForceLoad,
				ownUuid: ls.get("auth_uuid"),
				ownState,
				setOwnState,
				clearFromCache,
				refetchUser,
			}}
		>
			{children}
		</UsersContext.Provider>
	);
}