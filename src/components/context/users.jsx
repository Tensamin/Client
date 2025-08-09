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

	async function get(uuid) {
		if (typeof uuid !== "undefined") {
			if (fetchedUsers[uuid]) {
				log("User already fetched: " + uuid, "debug");
				return fetchedUsers[uuid];
			} else {
				let fetchedUser = await fetch(`${endpoint.user}${uuid}`)
					.then((response) => response.json())
					.then((data) => {
						if (data.type !== "error") {
							return data.data;
						} else {
							return {

							}
						}
					})
					.catch((error) => {
						return {

						}
					});

				if (!fetchedUser) {
					fetchedUser = {
						uuid: uuid,
						created_at: 0,
						username: "...",
						display: "...",
						avatar: "...",
						about: "This user does not exist",
						status: "Failed to load user.",
						public_key: "",
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
			}}
		>
			{children}
		</UsersContext.Provider>
	);
}